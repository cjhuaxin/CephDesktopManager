package base

import (
	"context"
	"database/sql"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/cjhuaxin/CephDesktopManager/backend/models"
	"github.com/cjhuaxin/CephDesktopManager/backend/resource"
	"github.com/cjhuaxin/CephDesktopManager/backend/util"
	"go.uber.org/zap"
)

type Service struct {
	Paths       *Paths
	Log         *zap.SugaredLogger
	S3ClientMap map[string]*s3.Client
	DbClient    *sql.DB
}

type Paths struct {
	HomeDir     string
	ConfDir     string
	DbDir       string
	LogDir      string
	TmpDir      string
	DownloadDir string
}

func (*Service) BuildSucess(data interface{}) *models.BaseResponse {
	return &models.BaseResponse{
		ErrCode: "0",
		ErrMsg:  "",
		Data:    data,
	}
}

func (*Service) BuildFailed(errCode, errMsg string) *models.BaseResponse {
	return &models.BaseResponse{
		ErrCode: errCode,
		ErrMsg:  errMsg,
		Data:    nil,
	}
}

func (s *Service) QueryEncryptionKey() (string, error) {
	stmt, err := s.DbClient.Prepare("SELECT value FROM key WHERE type = ?")
	if err != nil {
		s.Log.Errorf("prepare sql statement failed: %v", err)
		return "", err
	}
	encryptionKey := ""
	err = stmt.QueryRow(resource.KeyTypeEncryption).Scan(&encryptionKey)
	if err != nil {
		s.Log.Errorf("query encryption key failed: %v", err)
		return "", err
	}

	return encryptionKey, nil
}

func (s *Service) InitAndCacheS3Client(connectionId string) (*s3.Client, error) {
	// query encryption key from db
	encryptionKey, err := s.QueryEncryptionKey()
	if err != nil {
		s.Log.Errorf("query encryption key failed: %v", err)
		return nil, err
	}
	stmt, err := s.DbClient.Prepare("SELECT id,name,endpoint,ak,sk,region,path_style FROM connection WHERE id = ?")
	if err != nil {
		s.Log.Errorf("parepare statement failed: %v", err)
		return nil, err
	}
	// query the connection details by connection id
	var id, name, endpoint, ak, sk, region string
	var pathStyle int8
	err = stmt.QueryRow(connectionId).Scan(&id, &name, &endpoint, &ak, &sk, &region, &pathStyle)
	if err != nil {
		s.Log.Errorf("query row[%s] failed: %v", connectionId, err)
		return nil, err
	}
	// decypte the encyption key
	rawSk, err := util.DecryptByAES(sk, encryptionKey)
	if err != nil {
		s.Log.Errorf("decrypt sk[%s] failed: %v", sk, err)
		return nil, err
	}
	// initialize the s3 client
	s3Client, err := util.CreateS3ClientInstance(endpoint, ak, rawSk, region, pathStyle)
	if err != nil {
		s.Log.Errorf("decrypt sk[%s] failed: %v", sk, err)
		return nil, err
	}
	s.S3ClientMap[connectionId] = s3Client

	return s3Client, nil
}

func (s *Service) GetTimeoutContext() context.Context {
	ctx, _ := context.WithTimeout(context.TODO(), 10*time.Second)
	return ctx
}
