package service

import (
	"context"
	"os"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/cjhuaxin/CephDesktopManager/backend/base"
	"github.com/cjhuaxin/CephDesktopManager/backend/errcode"
	"github.com/cjhuaxin/CephDesktopManager/backend/models"
	"github.com/cjhuaxin/CephDesktopManager/backend/util"
	"github.com/rs/xid"
)

type Object struct {
	*base.Service
}

func NewObjectService(baseService *base.Service) *Object {
	return &Object{
		Service: baseService,
	}
}

func (s *Object) Init() error {
	return nil
}

func (s *Object) ListObjects(req *models.ListObjectsReq) *models.BaseResponse {
	s3Clinet, ok := s.S3ClientMap[req.ConnectionId]
	if !ok {
		s.Log.Errorf("connection[%s] is lost", req.ConnectionId)
		return s.BuildFailed(errcode.UnExpectedErr, "connection is lost,please re-connect")
	}
	input := &s3.ListObjectsV2Input{
		Bucket:  aws.String(req.Bucket),
		MaxKeys: req.PageSize,
	}
	if req.ContinueToken != "" {
		input.ContinuationToken = aws.String(req.ContinueToken)
	}
	if req.Prefix != "" {
		input.Prefix = aws.String(req.Prefix)
	}
	if req.Delimiter != "" {
		input.Delimiter = aws.String(req.Delimiter)
	}

	output, err := s3Clinet.ListObjectsV2(s.GetTimeoutContext(), input)
	if err != nil {
		s.Log.Errorf("list objects[bucket=%s] failed: %v", req.Bucket, err)
		return s.BuildFailed(errcode.CephErr, err.Error())
	}

	data := make([]*models.ObjectItem, 0, len(output.Contents)+len(output.CommonPrefixes))
	// add common prefix(folders)
	for _, c := range output.CommonPrefixes {
		originPrefix := *c.Prefix
		timePrefix := strings.Replace(originPrefix, req.Prefix, "", 1)

		data = append(data, &models.ObjectItem{
			ID:           xid.New().String(),
			Key:          timePrefix,
			CommonPrefix: true,
		})
	}

	// add objects
	for _, o := range output.Contents {
		keySlice := strings.Split(*o.Key, req.Delimiter)
		//trim the virtual folder, only show the object key
		trimKey := keySlice[len(keySlice)-1]

		data = append(data, &models.ObjectItem{
			ID:           xid.New().String(),
			Key:          trimKey,
			RealKey:      *o.Key,
			Size:         o.Size,
			LastModified: o.LastModified,
		})
	}

	res := &models.ListObjectsRes{
		Objects: data,
	}
	if output.NextContinuationToken != nil {
		res.NextContinuationToken = *output.NextContinuationToken
	}

	return s.BuildSucess(res)
}

func (s *Object) DownloadObjects(req *models.DownloadObjectsReq) *models.BaseResponse {
	s3Clinet, ok := s.S3ClientMap[req.ConnectionId]
	if !ok {
		s.Log.Errorf("connection[%s] is lost", req.ConnectionId)
		return s.BuildFailed(errcode.UnExpectedErr, "connection is lost,please re-connect")
	}

	downloader := util.CreateS3Downloader(s3Clinet)
	//query connection name for make directory
	stmt, err := s.DbClient.Prepare("SELECT name FROM connection WHERE id = ?")
	if err != nil {
		s.Log.Errorf("prepare sql statement failed: %v", err)
		return s.BuildFailed(errcode.DatabaseErr, err.Error())
	}
	connectionName := ""
	err = stmt.QueryRow(req.ConnectionId).Scan(&connectionName)
	if err != nil {
		s.Log.Errorf("query connection name failed: %v", err)
		return s.BuildFailed(errcode.DatabaseErr, err.Error())
	}

	for _, key := range req.Keys {
		// Create the directories in the path
		file, err := s.makeTargetDirectory(connectionName, req.Bucket, key)
		if err != nil {
			return s.BuildFailed(errcode.FileErr, err.Error())
		}
		// Set up the local file
		fd, err := os.Create(file)
		if err != nil {
			s.Log.Errorf("create file[%s] failed: %v", file, err)
			return s.BuildFailed(errcode.FileErr, err.Error())
		}
		defer fd.Close()
		input := &s3.GetObjectInput{
			Bucket: aws.String(req.Bucket),
			Key:    aws.String(key),
		}
		_, err = downloader.Download(context.TODO(), fd, input)
		if err != nil {
			s.Log.Errorf("download file[%s] failed: %v", file, err)
			return s.BuildFailed(errcode.FileErr, err.Error())
		}
	}

	return s.BuildSucess(s.Paths.DownloadDir)
}

func (s *Object) PrepareForUploading(req *models.PrepareForUploadingReq) *models.BaseResponse {
	//query connection name for make directory
	stmt, err := s.DbClient.Prepare("SELECT endpoint,ak,sk,region,path_style FROM connection WHERE id = ?")
	if err != nil {
		s.Log.Errorf("prepare sql statement failed: %v", err)
		return s.BuildFailed(errcode.DatabaseErr, err.Error())
	}
	var endpoint, ak, sk, region string
	var pathStyle int8
	err = stmt.QueryRow(req.ConnectionId).Scan(&endpoint, &ak, &sk, &region, &pathStyle)
	if err != nil {
		s.Log.Errorf("query connection information failed: %v", err)
		return s.BuildFailed(errcode.DatabaseErr, err.Error())
	}

	encryptionKey, err := s.QueryEncryptionKey()
	if err != nil {
		s.Log.Errorf("query encryption key failed: %v", err)
		return s.BuildFailed(errcode.AesEncryptErr, err.Error())
	}
	rawSk, err := util.DecryptByAES(sk, encryptionKey)
	if err != nil {
		s.Log.Errorf("AES decrypt failed: %v", err)
		return s.BuildFailed(errcode.AesEncryptErr, err.Error())
	}

	return s.BuildSucess(&models.ConnectionDetail{
		Endpoint:  endpoint,
		AccessKey: ak,
		SecretKey: rawSk,
		Region:    region,
		PathStyle: pathStyle,
	})
}

func (s *Object) DeleteObjects(req *models.DeleteObjectsReq) *models.BaseResponse {
	s3Clinet, ok := s.S3ClientMap[req.ConnectionId]
	if !ok {
		s.Log.Errorf("connection[%s] is lost", req.ConnectionId)
		return s.BuildFailed(errcode.UnExpectedErr, "connection is lost,please re-connect")
	}
	identifiers := make([]types.ObjectIdentifier, 0, len(req.Keys))
	for _, key := range req.Keys {
		identifiers = append(identifiers, types.ObjectIdentifier{
			Key: aws.String(key),
		})
	}
	input := &s3.DeleteObjectsInput{
		Bucket: aws.String(req.Bucket),
		Delete: &types.Delete{
			Objects: identifiers,
		},
	}
	output, err := s3Clinet.DeleteObjects(s.GetTimeoutContext(), input)
	if err != nil {
		s.Log.Errorf("delete objects failed: %v", err)
		return s.BuildFailed(errcode.CephErr, err.Error())
	}
	if len(output.Errors) != 0 {
		s.Log.Errorf("delete objects failed: %v", output.Errors[0])
		return s.BuildFailed(errcode.CephErr, *output.Errors[0].Message)
	}

	return s.BuildSucess(nil)
}

func (s *Object) makeTargetDirectory(connectionName, bucket, key string) (string, error) {
	file := filepath.Join(s.Paths.DownloadDir, connectionName, bucket, key)
	if err := os.MkdirAll(filepath.Dir(file), 0755); err != nil {
		s.Log.Errorf("make all dir failed: %s", filepath.Dir(file))
		return "", err
	}

	return file, nil
}
