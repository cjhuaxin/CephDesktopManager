package models

import "time"

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
	RealKey      string     `json:"realKey"` //the object storage key
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
	//store the percentage progress
	Percentage float64 `json:"percentage"`
	//store the download rate,unit:kb/s
	Rate float64 `json:"rate"`
}

type BucketInfo struct {
	Location string `json:"location"`

}
