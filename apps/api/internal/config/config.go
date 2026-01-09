package config

import "os"

type Config struct {
	ServerAddr    string
	MySQLDSN      string
	ClickHouseDSN string
	NATSURL       string
}

func Load() *Config {
	return &Config{
		ServerAddr:    getEnv("SERVER_ADDR", ":8080"),
		MySQLDSN:      getEnv("MYSQL_DSN", "root:password@tcp(mysql:3306)/playables?parseTime=true"),
		ClickHouseDSN: getEnv("CLICKHOUSE_DSN", "clickhouse://clickhouse:9000/analytics"),
		NATSURL:       getEnv("NATS_URL", "nats://nats:4222"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
