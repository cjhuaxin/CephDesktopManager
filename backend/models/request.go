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
	ContinueToken string `json:"continueToken"`
	Delimiter     string `json:"delimiter"`
	Prefix        string `json:"prefix"`
}
