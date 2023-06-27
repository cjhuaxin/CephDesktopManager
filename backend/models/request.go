package models

type NewConnectionReq struct {
	ConnectionDetail
}

type ListBucketsReq struct {
	ConnectionId string `json:"connectionId"`
}

type ListObjectsReq struct {
	ConnectionId  string `json:"connectionId"`
	Bucket        string `json:"bucket"`
	Delimiter     string `json:"delimiter"`
	Prefix        string `json:"prefix"`
	ContinueToken string `json:"continueToken"`
	PageSize      int32  `json:"pageSize"`
}

type DownloadObjectsReq struct {
	ConnectionId string   `json:"connectionId"`
	Bucket       string   `json:"bucket"`
	Keys         []string `json:"keys"`
}

type AddCustomBucketReq struct {
	ConnectionId string `json:"connectionId"`
	Bucket       string `json:"bucket"`
}

type PrepareForUploadingReq struct {
	ConnectionId string `json:"connectionId"`
}

type DeleteObjectsReq struct {
	ConnectionId string   `json:"connectionId"`
	Bucket       string   `json:"bucket"`
	Keys         []string `json:"keys"`
}

type CreateBucketReq struct {
	ConnectionId string `json:"connectionId"`
	Bucket       string `json:"bucket"`
}
type DeleteBucketReq struct {
	ConnectionId string `json:"connectionId"`
	Bucket       string `json:"bucket"`
	Custom       bool   `json:"custom"`
}

type EditConnectionReq struct {
	ConnectionDetail
}

type DeleteConnectionReq struct {
	ConnectionId string `json:"connectionId"`
}

type GetConnectionDetailReq struct {
	ConnectionId string `json:"connectionId"`
}
