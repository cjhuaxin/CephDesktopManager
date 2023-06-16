package models

type BaseResponse struct {
	ErrCode string      `json:"err_code"`
	ErrMsg  string      `json:"err_msg"`
	Data    interface{} `json:"data"`
}

type ConnectionItem struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
