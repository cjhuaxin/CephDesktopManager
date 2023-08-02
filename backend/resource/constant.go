package resource

const (
	AppTitle          = "Ceph Desktop Manager"
	AppName           = "CephDesktopManager"
	DefaultRegion     = "default"
	KeyTypeEncryption = "encryption"

	ForcePathSytle = 1

	DirPathHome     = ".cdm"
	DirPathConf     = "conf"
	DirPathDb       = "db"
	DirPathlog      = "log"
	DirPathTmp      = "tmp"
	DirPathDownload = "Downloads"

	DatabaseFile = "cdm.db"

	IconPath        = "build/icon/"
	IconAppIcon     = IconPath + "appicon.png"
	IconUpgradeIcon = IconPath + "upgrade.png"
)

const (
	CHECK_UPGRADE    = "CHECK_UPGRADE"
	UPGRADE_PROGRESS = "UPGRADE_PROGRESS"
	UPLOAD_PROGRESS  = "UPLOAD_PROGRESS"
)
