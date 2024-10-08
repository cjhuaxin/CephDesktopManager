package models

import (
	"time"
)

type BaseResponse struct {
	ErrCode string      `json:"err_code"`
	ErrMsg  string      `json:"err_msg"`
	Data    interface{} `json:"data"`
}

type ListObjectsRes struct {
	Objects               []*ObjectItem `json:"objects"`
	NextContinuationToken string        `json:"nextContinuationToken"`
}

type ConnectionItem struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ObjectItem struct {
	ID           string     `json:"id"`
	Key          string     `json:"key"`
	RealKey      string     `json:"realKey"` // the object storage key
	Size         int64      `json:"size"`
	LastModified *time.Time `json:"lastModified"`
	CommonPrefix bool       `json:"commonPrefix"`
}

type ConnectionDetail struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Endpoint  string `json:"endpoint"`
	AccessKey string `json:"accessKey"`
	SecretKey string `json:"secretKey"`
	Region    string `json:"region"`
	PathStyle int8   `json:"pathStyle"`
}

type BucketDetail struct {
	Bucket string `json:"bucket"`
	Custom bool   `json:"custom"`
}

type ReleaseDetail struct {
	CurrentVersion string `json:"currentVersion"`
	OS             string `json:"os"`
	ARCH           string `json:"arch"`
}

type UpgradeProgress struct {
	// store the percentage progress
	Percentage float64 `json:"percentage"`
	// store the download rate,unit:kb/s
	Rate float64 `json:"rate"`
}

type BucketInfo struct {
	Location   string           `json:"location"`
	Policy     string           `json:"policy"`
	Acls       []*Acl           `json:"acls"`
	Lifecycles []*LifecycleRule `json:"lifecycles"`
}

type LifecycleRule struct {
	ID                             string                          `json:"id"`
	Prefix                         string                          `json:"prefix"`
	Status                         string                          `json:"status"`
	AbortIncompleteMultipartUpload *AbortIncompleteMultipartUpload `json:"abortIncompleteMultipartUpload"`
	Expiration                     *LifecycleExpiration            `json:"expiration"`
}

type AbortIncompleteMultipartUpload struct {
	DaysAfterInitiation int `json:"daysAfterInitiation"`
}

type LifecycleExpiration struct {
	Date                      *time.Time `json:"date"`
	Days                      int        `json:"days"`
	ExpiredObjectDeleteMarker bool       `json:"expiredObjectDeleteMarker"`
}

type Acl struct {
	Permission  string `json:"permission"`
	DisplayName string `json:"displayName"`
}

type InitializeMultipartUploadRes struct {
	UploadID string `json:"uploadId"`
}

type PutMultipartUploadRes struct {
	ETag       string `json:"eTag"`
	PartNumber int32  `json:"partNumber"`
}

type UploadDetail struct {
	FileNameKey string `json:"fileNameKey"`
	PartSize    int    `json:"partSize"`
}
