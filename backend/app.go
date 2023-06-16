package backend

import (
	"context"
	"embed"
	"fmt"
	"os"
	"os/user"
	"path/filepath"
	"reflect"

	"github.com/cjhuaxin/CephDesktopManager/backend/resource"
	"github.com/cjhuaxin/CephDesktopManager/backend/service"

	"github.com/cjhuaxin/CephDesktopManager/backend/base"
	"github.com/wailsapp/wails/v2/pkg/options"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

type Bind interface {
	Init() error
}

// App struct
type App struct {
	*base.Service
}

func WailsInit(assets embed.FS) *options.App {
	baseService := &base.Service{}
	// Create an instance of the app structure
	app := &App{
		Service: baseService,
	}
	extraBindList := extraBinds(baseService)

	return &options.App{
		Title:            resource.AppTitle,
		Width:            1024,
		Height:           768,
		Assets:           assets,
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup: func(ctx context.Context) {
			err := app.onStart(ctx, extraBindList...)
			if err != nil {
				app.Log.Errorf("on startup error %v", err)
				os.Exit(-1)
			}
		},
		Bind: allBinds(app, extraBindList),
	}
}

func extraBinds(baseService *base.Service) []Bind {
	return []Bind{
		service.NewConnectionService(baseService),
		service.NewBucketService(baseService),
	}
}

func allBinds(app *App, extraBinds []Bind) []interface{} {
	all := make([]interface{}, 0, len(extraBinds)+1)
	all = append(all, app)

	for _, bind := range extraBinds {
		all = append(all, bind)
	}

	return all
}

func (a *App) onStart(ctx context.Context, binds ...Bind) error {
	//init directory for app
	err := a.initDirectoryStructure()
	if err != nil {
		return err
	}
	//init log
	a.initLog()
	for _, bind := range binds {
		err = bind.Init()
		if err != nil {
			return err
		}
	}

	return nil
}

func (a *App) initDirectoryStructure() error {
	u, err := user.Current()
	if err != nil {
		return err
	}
	homeDir := filepath.Join(u.HomeDir, ".cdm")
	fmt.Printf("user home is: %s\n", homeDir)
	a.Paths = &base.Paths{
		HomeDir: homeDir, // Home directory of the user
		ConfDir: filepath.Join(homeDir, "conf"),
		DbDir:   filepath.Join(homeDir, "db"),
		LogDir:  filepath.Join(homeDir, "log"),
		TmpDir:  filepath.Join(homeDir, "tmp"),
	}

	//create folder
	err = a.createFolderIfNotExists()
	if err != nil {
		return err
	}

	return nil
}

func (a *App) createFolderIfNotExists() error {
	pathValue := reflect.ValueOf(*a.Paths)
	for i := 0; i < pathValue.NumField(); i++ {
		path := pathValue.Field(i).String()
		if _, err := os.Stat(path); os.IsNotExist(err) {
			err = os.MkdirAll(path, os.ModePerm)
			if err != nil {
				return err
			}
		} else {
			return err
		}
	}

	return nil
}

func (a *App) initLog() {
	infoLogger := &lumberjack.Logger{
		Filename: filepath.Join(a.Paths.LogDir, "cdm.log"),
	}
	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	encoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder
	infoCore := zapcore.NewCore(
		zapcore.NewJSONEncoder(encoderConfig),
		zapcore.AddSync(infoLogger),
		zapcore.InfoLevel,
	)
	logger := zap.New(infoCore, zap.AddStacktrace(zapcore.FatalLevel))
	a.Log = logger.Sugar()

	defer a.Log.Sync()
}
