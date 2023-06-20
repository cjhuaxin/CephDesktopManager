package models

type NewConnectionReq struct {
	Name      string `json:"name"`
	Endpoint  string `json:"endpoint"`
	AccessKey string `json:"accesskey"`
	SecretKey string `json:"secretkey"`
	Region    string `json:"region"`
	PathStyle int8   `json:"pathstyle"`
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
