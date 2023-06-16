package resource

var (
	CreateConnectionTableSql    = "CREATE TABLE IF NOT EXISTS connection (id text not null primary key, name text, endpoint text,ak text,sk test,region text);"
	CreateConnectionTableIdxSql = "CREATE UNIQUE INDEX connection_name_IDX ON 'connection' (name);"
	CreateKeyTableSql           = "CREATE TABLE IF NOT EXISTS key (id text not null primary key, type text, value text);"
)
