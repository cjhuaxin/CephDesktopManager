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
	db, err := sql.Open("sqlite3", filepath.Join(s.Paths.DbDir, resource.DatabaseFile))
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
	normalizedEndpoint, encrypedSk, region, err := s.prepareSaveConnection(req.Endpoint, req.SecretKey, req.Region)
	if err != nil {
		return s.BuildFailed(errcode.DatabaseErr, "prepare save connection failed")
	}

	if req.ID == "" {
		//create a new connection
		connectionId := xid.New().String()
		_, err = s.DbClient.Exec(
			fmt.Sprintf("INSERT INTO connection(id,name,endpoint,ak,sk,region,path_style) values('%s','%s','%s','%s','%s','%s','%d')",
				connectionId, req.Name, normalizedEndpoint, req.AccessKey, encrypedSk, region, req.PathStyle))
		if err != nil {
			s.Log.Errorf("save the connection info to db failed: %v", err)
			return s.BuildFailed(errcode.DatabaseErr, err.Error())
		}
	} else {
		// edit the connection
		_, err = s.DbClient.Exec(
			fmt.Sprintf("UPDATE connection SET name = '%s',endpoint = '%s',ak = '%s',sk = '%s',region = '%s',path_style = %d WHERE id = '%s'",
				req.Name, normalizedEndpoint, req.AccessKey, encrypedSk, region, req.PathStyle, req.ID))
		if err != nil {
			s.Log.Errorf("update connection[%s] info to db failed: %v", req.ID, err)
			return s.BuildFailed(errcode.DatabaseErr, err.Error())
		}
		//create a new s3 client for cache
		s3Client, err := util.CreateS3ClientInstance(normalizedEndpoint, req.AccessKey, req.SecretKey, region, req.PathStyle)
		if err != nil {
			s.Log.Errorf("create s3 client failed: %v", req.ID, err)
			return s.BuildFailed(errcode.CephErr, err.Error())
		}

		s.S3ClientMap[req.ID] = s3Client
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

func (s *Connection) DeleteConnection(req *models.DeleteConnectionReq) *models.BaseResponse {
	tx, err := s.DbClient.Begin()
	if err != nil {
		s.Log.Errorf("begin tx failed: %v", err)
		return s.BuildFailed(errcode.DatabaseErr, err.Error())
	}

	defer func() {
		if err == nil {
			err = tx.Commit()
			if err != nil {
				s.Log.Errorf("tx commit failed: %v", err)
			}
		} else {
			err = tx.Rollback()
			if err != nil {
				s.Log.Errorf("tx rollback failed: %v", err)
			}
		}
	}()

	_, err = tx.Exec(fmt.Sprintf("DELETE FROM custom_bucket WHERE connection_id = '%s'", req.ConnectionId))
	if err != nil {
		s.Log.Errorf("delete custom bucket failed: %v", err)
		return s.BuildFailed(errcode.DatabaseErr, err.Error())
	}
	_, err = tx.Exec(fmt.Sprintf("DELETE FROM connection WHERE id = '%s'", req.ConnectionId))
	if err != nil {
		s.Log.Errorf("delete connection failed: %v", err)
		return s.BuildFailed(errcode.DatabaseErr, err.Error())
	}

	return s.BuildSucess(nil)
}

func (s *Connection) GetConnectionDetail(req *models.GetConnectionDetailReq) *models.BaseResponse {
	stmt, err := s.DbClient.Prepare("SELECT name,endpoint,ak,sk,region,path_style FROM connection WHERE id = ?")
	if err != nil {
		s.Log.Errorf("prepare sql statement failed: %v", err)
		return s.BuildFailed(errcode.DatabaseErr, err.Error())
	}
	var name, endpoint, ak, sk, region string
	var pathStyle int8
	err = stmt.QueryRow(req.ConnectionId).Scan(&name, &endpoint, &ak, &sk, &region, &pathStyle)
	if err != nil {
		s.Log.Errorf("query connection detail failed: %v", err)
		return s.BuildFailed(errcode.DatabaseErr, err.Error())
	}
	//query encryption key
	encryptionKey, err := s.QueryEncryptionKey()
	if err != nil {
		s.Log.Errorf("query encryption key failed: %v", err)
		return s.BuildFailed(errcode.DatabaseErr, err.Error())
	}

	// decypte the encyption key
	rawSk, err := util.DecryptByAES(sk, encryptionKey)
	if err != nil {
		s.Log.Errorf("decrypt sk[%s] failed: %v", sk, err)
		return s.BuildFailed(errcode.AesEncryptErr, err.Error())
	}

	return s.BuildSucess(&models.ConnectionDetail{
		ID:        req.ConnectionId,
		Name:      name,
		Endpoint:  endpoint,
		AccessKey: ak,
		SecretKey: rawSk,
		Region:    region,
		PathStyle: pathStyle,
	})
}

func (s *Connection) prepareSaveConnection(endpoint, secretKey, region string) (string, string, string, error) {
	normalizedEndpoint, err := util.NormalizeUrls(endpoint)
	if err != nil {
		return "", "", "", err
	}
	if region == "" {
		region = resource.DefaultRegion
	}

	encryptionKey, err := s.QueryEncryptionKey()
	if err != nil {
		s.Log.Errorf("query encryption key failed: %v", err)
		return "", "", "", err
	}
	encrypedSk, err := util.EncryptByAES(secretKey, encryptionKey)
	if err != nil {
		s.Log.Errorf("AES encrypt failed: %v", err)
		return "", "", "", err
	}

	return normalizedEndpoint, encrypedSk, region, nil
}

func initTable(db *sql.DB) error {
	// init connection table
	err := doInitTable(db, "connection", resource.CreateConnectionTableSql)
	if err != nil {
		// add unique index for name column
		_, err = db.Exec(resource.CreateConnectionTableIdxSql)
		if err != nil {
			return err
		}
	}

	// init key table
	err = doInitTable(db, "key", resource.CreateKeyTableSql)
	if err != nil {
		return err
	}

	// init custom_bucket table
	err = doInitTable(db, "custom_bucket", resource.CreateCustomBucketTableSql)
	if err != nil {
		return err
	}

	// init encryption key
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

func doInitTable(db *sql.DB, tableName, ddl string) error {
	checkTableStmt, err := db.Prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
	if err != nil {
		return err
	}
	err = checkTableStmt.QueryRow(tableName).Scan(&tableName)
	if err != nil {
		if err != sql.ErrNoRows {
			return err
		}
		// create key table
		_, err = db.Exec(ddl)
		if err != nil {
			return err
		}
	}

	return nil
}
