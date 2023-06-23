package service

import (
	"fmt"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/cjhuaxin/CephDesktopManager/backend/base"
	"github.com/cjhuaxin/CephDesktopManager/backend/errcode"
	"github.com/cjhuaxin/CephDesktopManager/backend/models"
	"github.com/rs/xid"
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

	// query bucket list from ceph
	output, err := s3Client.ListBuckets(s.GetTimeoutContext(), &s3.ListBucketsInput{})
	if err != nil {
		s.Log.Errorf("list buckets error: %v", err)
		return s.BuildFailed(errcode.CephErr, err.Error())
	}
	bucketList := make([]string, 0)

	// query custom buckets
	rows, err := s.DbClient.Query("SELECT id, name from custom_bucket WHERE connection_id = ?", req.ConnectionId)
	if err != nil {
		s.Log.Errorf("query custom bucket failed: %v", err)
		return s.BuildFailed(errcode.DatabaseErr, err.Error())
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		var name string
		err = rows.Scan(&id, &name)
		if err != nil {
			s.Log.Errorf("scan custom bucket failed: %v", err)
			continue
		}
		bucketList = append(bucketList, name)
	}

	for _, bucket := range output.Buckets {
		bucketList = append(bucketList, *bucket.Name)
	}

	return s.BuildSucess(bucketList)
}

func (s *Bucket) AddCustomBucket(req *models.AddCustomBucketReq) *models.BaseResponse {
	_, err := s.DbClient.Exec(
		fmt.Sprintf("INSERT INTO custom_bucket(id,name,connection_id) values('%s','%s','%s')",
			xid.New().String(), req.Bucket, req.ConnectionId))
	if err != nil {
		s.Log.Errorf("save the custom bucket to db failed: %v", err)
		return s.BuildFailed(errcode.DatabaseErr, err.Error())
	}

	return s.BuildSucess(nil)
}
