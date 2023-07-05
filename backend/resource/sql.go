package resource

var (
	CreateConnectionTableSql    = "CREATE TABLE connection (id text not null primary key, name text, endpoint text,ak text,sk test,region text, path_style INTEGER);"
	CreateConnectionTableIdxSql = "CREATE UNIQUE INDEX connection_name_IDX ON 'connection' (name);"
	CreateKeyTableSql           = "CREATE TABLE IF NOT EXISTS key (id text not null primary key, type text, value text);"
	CreateCustomBucketTableSql  = "CREATE TABLE IF NOT EXISTS custom_bucket (id text not null primary key, name text, connection_id text);"
)
