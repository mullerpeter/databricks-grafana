package plugin

import (
	"fmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"math"
	"regexp"
	"strings"
	"time"
)

func getIntervalString(duration time.Duration) string {
	hours := int(math.Floor(duration.Hours()))
	minutes := int(math.Floor(duration.Minutes()))
	seconds := int(math.Floor(duration.Seconds()))

	returnString := ""

	deliminator := ""
	if hours > 0 {
		returnString = fmt.Sprintf("%s%s%d HOURS", returnString, deliminator, hours)
		deliminator = " "
	}

	remainingMinutes := minutes - (hours * 60)
	if remainingMinutes > 0 {
		returnString = fmt.Sprintf("%s%s%d MINUTES", returnString, deliminator, remainingMinutes)
		deliminator = " "
	}

	remainingSeconds := seconds - (minutes * 60)
	if remainingSeconds > 0 {
		returnString = fmt.Sprintf("%s%s%d SECONDS", returnString, deliminator, remainingSeconds)
		deliminator = " "
	}

	return returnString
}

func createQueryBuilderQuery(query backend.DataQuery, qm queryModel) string {
	sqlQuery := ""
	whereQuery := ""
	if qm.WhereQuery != "" {
		whereQuery = fmt.Sprintf(" %s AND", qm.WhereQuery)
	}

	intervalString := getIntervalString(query.Interval)

	sqlQuery = fmt.Sprintf("SELECT window.start, avg(%s) AS value FROM %s WHERE%s %s BETWEEN '%s' AND '%s' GROUP BY window(%s, '%s')",
		qm.ValueColumnName,
		qm.TableName,
		whereQuery,
		qm.TimeColumnName,
		query.TimeRange.From.UTC().Format("2006-01-02 15:04:05"),
		query.TimeRange.To.UTC().Format("2006-01-02 15:04:05"),
		qm.TimeColumnName,
		intervalString)

	return sqlQuery
}

func replaceMacros(sqlQuery string, query backend.DataQuery) string {

	queryString := sqlQuery
	log.DefaultLogger.Info("Raw SQL Query selected", "query", queryString)

	interval_string := getIntervalString(query.Interval)

	var rgx = regexp.MustCompile(`\$__timeWindow\(([a-zA-Z0-9_-]+)\)`)
	if rgx.MatchString(queryString) {
		log.DefaultLogger.Info("__timeWindow placeholder found")
		rs := rgx.FindStringSubmatch(queryString)
		timeColumnName := rs[1]
		queryString = rgx.ReplaceAllString(queryString, fmt.Sprintf("window(%s, '%s')", timeColumnName, interval_string))

		rgx = regexp.MustCompile(`\$__time\(([a-zA-Z0-9_-]+)\)`)
		if rgx.MatchString(queryString) {
			log.DefaultLogger.Info("__time placeholder found")
			queryString = rgx.ReplaceAllString(queryString, "window.start")
		}

		rgx = regexp.MustCompile(`\$__value\(([a-zA-Z0-9_-]+)\)`)
		if rgx.MatchString(queryString) {
			log.DefaultLogger.Info("__value placeholder found")
			rs = rgx.FindStringSubmatch(queryString)
			valueColumnName := rs[1]
			queryString = rgx.ReplaceAllString(queryString, fmt.Sprintf("avg(%s) AS value", valueColumnName))
		}
	} else {
		rgx = regexp.MustCompile(`\$__time\(([a-zA-Z0-9_-]+)\)`)
		if rgx.MatchString(queryString) {
			log.DefaultLogger.Info("__time placeholder found")
			rs := rgx.FindStringSubmatch(queryString)
			timeColumnName := rs[1]
			queryString = rgx.ReplaceAllString(queryString, fmt.Sprintf("%s AS time", timeColumnName))
		}

		rgx = regexp.MustCompile(`\$__value\(([a-zA-Z0-9_-]+)\)`)
		if rgx.MatchString(queryString) {
			log.DefaultLogger.Info("__value placeholder found")
			rs := rgx.FindStringSubmatch(queryString)
			valueColumnName := rs[1]
			queryString = rgx.ReplaceAllString(queryString, fmt.Sprintf("%s AS value", valueColumnName))
		}
	}

	rgx = regexp.MustCompile(`\$__timeFilter\(([a-zA-Z0-9_-]+)\)`)
	if rgx.MatchString(queryString) {
		rs := rgx.FindStringSubmatch(queryString)
		timeColumnName := rs[1]
		timeRangeFilter := fmt.Sprintf("%s BETWEEN '%s' AND '%s'",
			timeColumnName,
			query.TimeRange.From.UTC().Format("2006-01-02 15:04:05"),
			query.TimeRange.To.UTC().Format("2006-01-02 15:04:05"),
		)
		queryString = rgx.ReplaceAllString(queryString, timeRangeFilter)
	}

	queryString = strings.ReplaceAll(queryString, "$__timeFrom", query.TimeRange.From.UTC().Format("2006-01-02 15:04:05"))

	queryString = strings.ReplaceAll(queryString, "$__timeTo", query.TimeRange.To.UTC().Format("2006-01-02 15:04:05"))

	queryString = strings.ReplaceAll(queryString, "$__interval", interval_string)

	return queryString
}
