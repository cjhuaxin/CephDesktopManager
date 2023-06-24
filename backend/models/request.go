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
