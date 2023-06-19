package service

import (
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/cjhuaxin/CephDesktopManager/backend/base"
	"github.com/cjhuaxin/CephDesktopManager/backend/errcode"
	"github.com/cjhuaxin/CephDesktopManager/backend/models"
)

type Bucket struct {
	*base.Service
}

func NewBucketService(baseService *base.Service) *Bucket {
	return &Bucket{
		Service: baseService,
	}
}

func (s *Bucket) Init() error {
	return nil
}

func (s *Bucket) ListBuckets(req *models.ListBucketsReq) *models.BaseResponse {
	s3Client := s.S3ClientMap[req.ConnectionId]
	if s3Client == nil {
		c, err := s.InitAndCacheS3Client(req.ConnectionId)
		if err != nil {
			return s.BuildFailed(errcode.CephErr, err.Error())
		}
		s3Client = c
		s.S3ClientMap[req.ConnectionId] = s3Client
	}

	output, err := s3Client.ListBuckets(s.GetTimeoutContext(), &s3.ListBucketsInput{})
	if err != nil {
		s.Log.Errorf("list buckets error: %v", err)
		return s.BuildFailed(errcode.CephErr, err.Error())
	}
	bucketList := make([]string, 0, len(output.Buckets))
	for _, bucket := range output.Buckets {
		bucketList = append(bucketList, *bucket.Name)
	}

	return s.BuildSucess(bucketList)
}
