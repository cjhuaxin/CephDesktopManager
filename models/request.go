package models

type NewConnectionReq struct {
	Name      string `json:"name"`
	Endpoint  string `json:"endpoint"`
	AccessKey string `json:"accesskey"`
	SecretKey string `json:"secretkey"`
	Region    string `json:"region"`
}

type ListBucketsReq struct {
	ConnectionId string `json:"connectionId"`
}
