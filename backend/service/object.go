package service

import (
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/cjhuaxin/CephDesktopManager/backend/base"
	"github.com/cjhuaxin/CephDesktopManager/backend/errcode"
	"github.com/cjhuaxin/CephDesktopManager/backend/models"
	"github.com/cjhuaxin/CephDesktopManager/backend/resource"
	"github.com/rs/xid"
)

type Object struct {
	*base.Service
	Pagesize int32
}

func NewObjectService(baseService *base.Service) *Object {
	return &Object{
		Service: baseService,
	}
}

func (s *Object) Init() error {
	s.Pagesize = resource.DefaultObjectPagesize
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
		MaxKeys: s.Pagesize,
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
