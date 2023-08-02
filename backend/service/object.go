package service

import (
	"context"
	"mime/multipart"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strconv"
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

func (s *Object) ServiceName() string {
	return "Object"
}

func (s *Object) ListObjects(req *models.ListObjectsReq) *models.BaseResponse {
	s3Client, err := s.GetCachedS3Client(req.ConnectionId)
	if err != nil {
		s.Log.Errorf("get connection[%s] failed: %v", req.ConnectionId, err)
		return s.BuildFailed(errcode.UnExpectedErr, err.Error())
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
	ctx, cancel := s.GetTimeoutContext()
	defer cancel()
	output, err := s3Client.ListObjectsV2(ctx, input)
	if err != nil {
		s.Log.Errorf("list objects[bucket=%s] failed: %v", req.Bucket, err)
		return s.BuildFailed(errcode.CephErr, err.Error())
	}

	data := make([]*models.ObjectItem, 0, len(output.Contents)+len(output.CommonPrefixes))
	// add common prefix(folders)
	for _, c := range output.CommonPrefixes {
		originPrefix := *c.Prefix
		trimedPrefix := originPrefix
		if req.Prefix != "" {
			// click folder no search keyword
			prefix := req.Prefix
			if !strings.HasSuffix(req.Prefix, req.Delimiter) {
				//contains the search keyword
				prefixIndex := strings.LastIndex(req.Prefix, req.Delimiter)
				prefix = req.Prefix[:prefixIndex+1]
			}

			trimedPrefix = strings.Replace(originPrefix, prefix, "", 1)
		}

		data = append(data, &models.ObjectItem{
			ID:           xid.New().String(),
			Key:          trimedPrefix,
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
	s3Client, err := s.GetCachedS3Client(req.ConnectionId)
	if err != nil {
		s.Log.Errorf("get connection[%s] failed: %v", req.ConnectionId, err)
		return s.BuildFailed(errcode.UnExpectedErr, err.Error())
	}

	downloader := util.CreateS3Downloader(s3Client)
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

func (s *Object) CreateMultipartUpload(req *models.CreateMultipartUploadReq) *models.BaseResponse {
	s3Client, err := s.GetCachedS3Client(req.ConnectionId)
	if err != nil {
		s.Log.Errorf("get connection[%s] failed: %v", req.ConnectionId, err)
		return s.BuildFailed(errcode.UnExpectedErr, err.Error())
	}
	ctx, cancel := s.GetTimeoutContext()
	defer cancel()
	createOutput, err := s3Client.CreateMultipartUpload(ctx, &s3.CreateMultipartUploadInput{
		Bucket: aws.String(req.Bucket),
		Key:    aws.String(req.Key),
	})
	if err != nil {
		s.Log.Errorf("create multipart upload[%s|%s] failed: %v", req.Bucket, req.Key, err)
		return s.BuildFailed(errcode.UnExpectedErr, err.Error())
	}

	return s.BuildSucess(&models.InitializeMultipartUploadRes{
		UploadID: *createOutput.UploadId,
	})
}

func (s *Object) PutMultipartUpload(fileHeader *multipart.FileHeader, params url.Values) *models.BaseResponse {
	file, err := fileHeader.Open()
	if err != nil {
		s.Log.Errorf("open file[%s] failed: %v", fileHeader.Filename, err)
		return s.BuildFailed(errcode.UnExpectedErr, err.Error())
	}
	connectionId := params.Get("connectionId")
	bucket := params.Get("bucket")
	key := params.Get("key")
	uploadId := params.Get("uploadId")
	partNumberStr := params.Get("partNumber")
	partNumber, err := strconv.ParseInt(partNumberStr, 10, 64)
	if err != nil {
		s.Log.Errorf("parse int[%s] failed: %v", partNumberStr, err)
		return s.BuildFailed(errcode.UnExpectedErr, err.Error())
	}
	s3Client, err := s.GetCachedS3Client(connectionId)
	if err != nil {
		s.Log.Errorf("get connection[%s] failed: %v", connectionId, err)
		return s.BuildFailed(errcode.UnExpectedErr, err.Error())
	}
	out, err := s3Client.UploadPart(context.TODO(), &s3.UploadPartInput{
		Bucket:     aws.String(bucket),
		Key:        aws.String(key),
		UploadId:   aws.String(uploadId),
		PartNumber: int32(partNumber),
		Body:       file,
	})
	if err != nil {
		s.Log.Errorf("upload part [%s|%s|%d] failed: %v", bucket, key, partNumber, err)
		return s.BuildFailed(errcode.UnExpectedErr, err.Error())
	}
	etag := *out.ETag

	return s.BuildSucess(&models.PutMultipartUploadRes{
		ETag:       etag[1 : len(etag)-1],
		PartNumber: int32(partNumber),
	})
}

func (s *Object) CompleteMultipartUpload(req *models.CompleteMultipartUploadReq) *models.BaseResponse {
	s3Client, err := s.GetCachedS3Client(req.ConnectionId)
	if err != nil {
		s.Log.Errorf("get connection[%s] failed: %v", req.ConnectionId, err)
		return s.BuildFailed(errcode.UnExpectedErr, err.Error())
	}
	ctx, cancel := s.GetTimeoutContext()
	defer cancel()
	parts := make([]types.CompletedPart, 0, len(req.Etags))
	//sort by parts
	sort.SliceStable(req.Etags, func(i, j int) bool {
		return req.Etags[i].Part < req.Etags[j].Part
	})
	for _, part := range req.Etags {
		parts = append(parts, types.CompletedPart{
			ETag:       aws.String(part.Value),
			PartNumber: part.Part,
		})
	}
	_, err = s3Client.CompleteMultipartUpload(ctx, &s3.CompleteMultipartUploadInput{
		Bucket:   aws.String(req.Bucket),
		Key:      aws.String(req.Key),
		UploadId: aws.String(req.UploadID),
		MultipartUpload: &types.CompletedMultipartUpload{
			Parts: parts,
		},
	})
	if err != nil {
		s.Log.Errorf("complete multipart upload[%s|%s|%s] failed: %v", req.Bucket, req.Key, req.UploadID, err)
		return s.BuildFailed(errcode.UnExpectedErr, err.Error())
	}

	return s.BuildSucess(nil)
}

func (s *Object) AbortMultipartUpload(req *models.AbortMultipartUploadReq) *models.BaseResponse {
	s3Client, err := s.GetCachedS3Client(req.ConnectionId)
	if err != nil {
		s.Log.Errorf("get connection[%s] failed: %v", req.ConnectionId, err)
		return s.BuildFailed(errcode.UnExpectedErr, err.Error())
	}
	ctx, cancel := s.GetTimeoutContext()
	defer cancel()
	_, err = s3Client.AbortMultipartUpload(ctx, &s3.AbortMultipartUploadInput{
		Bucket:   aws.String(req.Bucket),
		Key:      aws.String(req.Key),
		UploadId: aws.String(req.UploadID),
	})

	if err != nil {
		s.Log.Errorf("abort multipart upload[%s|%s|%s] failed: %v", req.Bucket, req.Key, req.UploadID, err)
		return s.BuildFailed(errcode.UnExpectedErr, err.Error())
	}

	return s.BuildSucess(nil)
}

func (s *Object) DeleteObjects(req *models.DeleteObjectsReq) *models.BaseResponse {
	s3Client, err := s.GetCachedS3Client(req.ConnectionId)
	if err != nil {
		s.Log.Errorf("get connection[%s] failed: %v", req.ConnectionId, err)
		return s.BuildFailed(errcode.UnExpectedErr, err.Error())
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
	ctx, cancel := s.GetTimeoutContext()
	defer cancel()
	output, err := s3Client.DeleteObjects(ctx, input)
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
