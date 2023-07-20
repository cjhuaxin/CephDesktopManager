package service

import (
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
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
	ctx, cancel := s.GetTimeoutContext()
	defer cancel()
	output, err := s3Client.ListBuckets(ctx, &s3.ListBucketsInput{})
	if err != nil {
		s.Log.Errorf("list buckets error: %v", err)
		return s.BuildFailed(errcode.CephErr, err.Error())
	}
	bucketList := make([]*models.BucketDetail, 0)

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
		bucketList = append(bucketList, &models.BucketDetail{
			Bucket: name,
			Custom: true,
		})
	}

	for _, bucket := range output.Buckets {
		bucketList = append(bucketList, &models.BucketDetail{
			Bucket: *bucket.Name,
			Custom: false,
		})
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

func (s *Bucket) CreateBucket(req *models.CreateBucketReq) *models.BaseResponse {
	s3Client, err := s.GetCachedS3Client(req.ConnectionId)
	if err != nil {
		s.Log.Errorf("get connection[%s] failed: %v", req.ConnectionId, err)
		return s.BuildFailed(errcode.UnExpectedErr, err.Error())
	}
	input := &s3.CreateBucketInput{
		Bucket: aws.String(req.Bucket),
	}
	ctx, cancel := s.GetTimeoutContext()
	defer cancel()
	_, err = s3Client.CreateBucket(ctx, input)
	if err != nil {
		s.Log.Errorf("create bucket to db failed: %v", err)
		return s.BuildFailed(errcode.CephErr, err.Error())
	}

	return s.BuildSucess(nil)
}

func (s *Bucket) DeleteBucket(req *models.DeleteBucketReq) *models.BaseResponse {
	if req.Custom {
		// only delete the custom bucket
		_, err := s.DbClient.Exec(fmt.Sprintf("DELETE FROM custom_bucket WHERE connection_id = '%s' AND name = '%s' ", req.ConnectionId, req.Bucket))
		if err != nil {
			s.Log.Errorf("delete custom bucket failed: %v", err)
			return s.BuildFailed(errcode.DatabaseErr, err.Error())
		}
	} else {
		// delete the real bucket
		s3Client, ok := s.S3ClientMap[req.ConnectionId]
		if !ok {
			s.Log.Errorf("connection[%s] is lost", req.ConnectionId)
			return s.BuildFailed(errcode.UnExpectedErr, "connection is lost,please re-connect")
		}
		ctx, cancel := s.GetTimeoutContext()
		defer cancel()
		_, err := s3Client.DeleteBucket(ctx, &s3.DeleteBucketInput{
			Bucket: aws.String(req.Bucket),
		})
		if err != nil {
			s.Log.Errorf("delete bucket[%s] failed: %v", req.Bucket, err)
			return s.BuildFailed(errcode.CephErr, err.Error())
		}
	}

	return s.BuildSucess(nil)
}

func (s *Bucket) GetBucketInfo(req *models.GetBucketInfoReq) *models.BaseResponse {
	s3Client, err := s.GetCachedS3Client(req.ConnectionId)
	if err != nil {
		s.Log.Errorf("get connection[%s] failed: %v", req.ConnectionId, err)
		return s.BuildFailed(errcode.UnExpectedErr, err.Error())
	}

	bucketInfo := &models.BucketInfo{}
	ctx, cancel := s.GetTimeoutContext()
	defer cancel()
	// get bucket location
	headResp, err := s3Client.GetBucketLocation(ctx, &s3.GetBucketLocationInput{
		Bucket: aws.String(req.Bucket),
	})
	if err == nil {
		bucketInfo.Location = string(headResp.LocationConstraint)
	} else {
		s.Log.Errorf("get bucket location failed: %v", err)
	}
	// get bucket policy
	policyResp, err := s3Client.GetBucketPolicy(ctx, &s3.GetBucketPolicyInput{
		Bucket: aws.String(req.Bucket),
	})
	if err == nil {
		bucketInfo.Policy = *policyResp.Policy
		fmt.Printf("%s\n",*policyResp.Policy)
	} else {
		s.Log.Errorf("get bucket policy failed: %v", err)
	}
	// get bucket ACL
	aclResp, err := s3Client.GetBucketAcl(ctx, &s3.GetBucketAclInput{
		Bucket: aws.String(req.Bucket),
	})
	if err == nil {
		aclList := make([]*models.Acl, 0, len(aclResp.Grants))
		for _, grant := range aclResp.Grants {
			aclList = append(aclList, &models.Acl{
				Permission:  string(grant.Permission),
				DisplayName: *grant.Grantee.DisplayName,
			})
		}
		bucketInfo.Acls = aclList
	} else {
		s.Log.Errorf("head bucket failed: %v", err)
	}

	return s.BuildSucess(bucketInfo)
}
