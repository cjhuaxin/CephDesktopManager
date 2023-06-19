package service

import (
	"database/sql"
	"fmt"
	"path/filepath"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/cjhuaxin/CephDesktopManager/backend/base"
	"github.com/cjhuaxin/CephDesktopManager/backend/errcode"
	"github.com/cjhuaxin/CephDesktopManager/backend/models"
	"github.com/cjhuaxin/CephDesktopManager/backend/resource"
	"github.com/cjhuaxin/CephDesktopManager/backend/util"
	_ "github.com/mattn/go-sqlite3"
	"github.com/rs/xid"
	"github.com/thanhpk/randstr"
)

type Connection struct {
	*base.Service
}

func NewConnectionService(baseService *base.Service) *Connection {
	return &Connection{
		Service: baseService,
	}
}

func (s *Connection) Init() error {
	err := s.initDbClient()
	if err != nil {
		return err
	}
	s.S3ClientMap = make(map[string]*s3.Client)

	return nil
}

func (s *Connection) initDbClient() error {
	db, err := sql.Open("sqlite3", filepath.Join(s.Paths.DbDir, "cdm.db"))
	if err != nil {
		s.Log.Errorf("open database error: %v", err)
		return err
	}
	err = initTable(db)
	if err != nil {
		s.Log.Errorf("create table error: %v", err)
		return err
	}

	s.DbClient = db

	return nil
}

func (s *Connection) TestS3Connection(req *models.NewConnectionReq) *models.BaseResponse {
	normalizedEndpoint, err := util.NormalizeUrls(req.Endpoint)
	if err != nil {
		return s.BuildFailed(errcode.InvalidEndpointErr, err.Error())
	}
	region := req.Region
	if region == "" {
		region = resource.DefaultRegion
	}

	s3Client, err := util.CreateS3ClientInstance(normalizedEndpoint, req.AccessKey, req.SecretKey, region, req.PathStyle)
	if err != nil {
		return s.BuildFailed(errcode.ConnectionErr, err.Error())
	}
	_, err = s3Client.ListBuckets(s.GetTimeoutContext(), &s3.ListBucketsInput{})
	if err != nil {
		return s.BuildFailed(errcode.CephErr, err.Error())
	}

	return s.BuildSucess(nil)
}

func (s *Connection) SaveS3Connection(req *models.NewConnectionReq) *models.BaseResponse {
	normalizedEndpoint, err := util.NormalizeUrls(req.Endpoint)
	if err != nil {
		return s.BuildFailed(errcode.InvalidEndpointErr, err.Error())
	}
	region := req.Region
	if region == "" {
		region = resource.DefaultRegion
	}
	connectionId := xid.New().String()
	encryptionKey, err := s.QueryEncryptionKey()
	if err != nil {
		s.Log.Errorf("query encryption key failed: %v", err)
		return s.BuildFailed(errcode.AesEncryptErr, err.Error())
	}
	encrypedSk, err := util.EncryptByAES(req.SecretKey, encryptionKey)
	if err != nil {
		s.Log.Errorf("AES encrypt failed: %v", err)
		return s.BuildFailed(errcode.AesEncryptErr, err.Error())
	}
	_, err = s.DbClient.Exec(
		fmt.Sprintf("INSERT INTO connection(id,name,endpoint,ak,sk,region,path_style) values('%s','%s','%s','%s','%s','%s','%d')",
			connectionId, req.Name, normalizedEndpoint, req.AccessKey, encrypedSk, region, req.PathStyle))
	if err != nil {
		s.Log.Errorf("save the connection info to db failed: %v", err)
		return s.BuildFailed(errcode.DatabaseErr, err.Error())
	}

	return s.BuildSucess(nil)
}

func (s *Connection) GetSavedConnectionList() *models.BaseResponse {
	rows, err := s.DbClient.Query("SELECT id, name from connection")
	if err != nil {
		s.Log.Errorf("query connection failed: %v", err)
		return s.BuildFailed(errcode.DatabaseErr, err.Error())
	}
	defer rows.Close()
	connectionList := make([]*models.ConnectionItem, 0)
	for rows.Next() {
		var id string
		var name string
		err = rows.Scan(&id, &name)
		if err != nil {
			s.Log.Errorf("query connection failed: %v", err)
			continue
		}
		connectionList = append(connectionList, &models.ConnectionItem{
			ID:   id,
			Name: name,
		})
	}

	return s.BuildSucess(connectionList)
}

func initTable(db *sql.DB) error {
	checkTableStmt, err := db.Prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
	if err != nil {
		return err
	}
	// init connection table
	connectionTableName := "connection"
	err = checkTableStmt.QueryRow(connectionTableName).Scan(&connectionTableName)
	if err != nil {
		if err != sql.ErrNoRows {
			return err
		}
		// craete connection table
		_, err = db.Exec(resource.CreateConnectionTableSql)
		if err != nil {
			return err
		}
		// add unique index for name column
		_, err = db.Exec(resource.CreateConnectionTableIdxSql)
		if err != nil {
			return err
		}
	}

	// init key table
	keyTableName := "key"
	err = checkTableStmt.QueryRow(keyTableName).Scan(&keyTableName)
	if err != nil {
		if err != sql.ErrNoRows {
			return err
		}
		// create key table
		_, err = db.Exec(resource.CreateKeyTableSql)
		if err != nil {
			return err
		}
	}

	row, err := db.Query("SELECT * FROM key LIMIT 1")
	if err != nil {
		return err
	}
	if !row.Next() {
		// insert AES encryption key if not exists
		encryptionKey := randstr.String(32)
		_, err = db.Exec(
			fmt.Sprintf("insert into key(id, type, value) values('%s', '%s', '%s')",
				xid.New().String(),
				resource.KeyTypeEncryption,
				encryptionKey),
		)
		if err != nil {
			return err
		}
	}

	return nil
}
