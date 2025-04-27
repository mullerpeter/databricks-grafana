package plugin

import (
	"fmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"regexp"
	"strings"
	"time"
)

func getIntervalString(duration time.Duration) string {
	parts := []string{}
	if hours := int(duration.Hours()); hours > 0 {
		parts = append(parts, fmt.Sprintf("%d HOURS", hours))
		duration -= time.Duration(hours) * time.Hour
	}
	if minutes := int(duration.Minutes()); minutes > 0 {
		parts = append(parts, fmt.Sprintf("%d MINUTES", minutes))
		duration -= time.Duration(minutes) * time.Minute
	}
	if seconds := int(duration.Seconds()); seconds > 0 {
		parts = append(parts, fmt.Sprintf("%d SECONDS", seconds))
		duration -= time.Duration(seconds) * time.Second
	}
	if milliseconds := int(duration.Milliseconds()); milliseconds > 0 {
		parts = append(parts, fmt.Sprintf("%d MILLISECONDS", milliseconds))
	}
	return strings.Join(parts, " ")
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

	type timeGroupMacroType struct {
		macro       string
		replacement string
	}

	timeGroupMacros := []timeGroupMacroType{
		{`\$__timeGroup\(([a-zA-Z0-9_-]+),'([a-zA-Z0-9_-]+)'\)`, "window(%s, '%s')"},
	}

	for _, timeGroupMacro := range timeGroupMacros {
		rgx = regexp.MustCompile(timeGroupMacro.macro)
		if rgx.MatchString(queryString) {
			rs := rgx.FindStringSubmatch(queryString)
			timeColumnName := rs[1]
			interval := rs[2]
			queryString = rgx.ReplaceAllString(queryString, fmt.Sprintf(timeGroupMacro.replacement, timeColumnName, interval))
		}

	}

	type timeFilterMacroType struct {
		macro       string
		replacement string
		from        string
		to          string
	}
	timefilterMacros := []timeFilterMacroType{
		{`\$__timeFilter\(([a-zA-Z0-9_-]+)\)`, "%s BETWEEN '%s' AND '%s'", query.TimeRange.From.UTC().Format("2006-01-02 15:04:05"), query.TimeRange.To.UTC().Format("2006-01-02 15:04:05")},
		{`\$__unixEpochNanoFilter\(([a-zA-Z0-9_-]+)\)`, "%s BETWEEN %s AND %s", fmt.Sprintf("%d", query.TimeRange.From.UnixNano()), fmt.Sprintf("%d", query.TimeRange.To.UnixNano())},
		{`\$__unixEpochFilter\(([a-zA-Z0-9_-]+)\)`, "%s BETWEEN %s AND %s", fmt.Sprintf("%d", query.TimeRange.From.Unix()), fmt.Sprintf("%d", query.TimeRange.To.Unix())},
	}

	for _, timefilterMacro := range timefilterMacros {
		rgx = regexp.MustCompile(timefilterMacro.macro)
		if rgx.MatchString(queryString) {
			rs := rgx.FindStringSubmatch(queryString)
			timeColumnName := rs[1]
			timeRangeFilter := fmt.Sprintf(timefilterMacro.replacement,
				timeColumnName,
				timefilterMacro.from,
				timefilterMacro.to,
			)
			queryString = rgx.ReplaceAllString(queryString, timeRangeFilter)
		}
	}

	simpleMacros := map[string]string{
		"$__timeFrom()":          fmt.Sprintf("FROM_UNIXTIME(%d)", query.TimeRange.From.Unix()),
		"$__timeTo()":            fmt.Sprintf("FROM_UNIXTIME(%d)", query.TimeRange.To.Unix()),
		"$____interval_long":     interval_string,
		"$__unixEpochFrom()":     fmt.Sprintf("%d", query.TimeRange.From.Unix()),
		"$__unixEpochTo()":       fmt.Sprintf("%d", query.TimeRange.To.Unix()),
		"$__unixEpochNanoFrom()": fmt.Sprintf("%d", query.TimeRange.From.UnixNano()),
		"$__unixEpochNanoTo()":   fmt.Sprintf("%d", query.TimeRange.To.UnixNano()),
		"$__timeFrom":            query.TimeRange.From.UTC().Format("2006-01-02 15:04:05"),
		"$__timeTo":              query.TimeRange.To.UTC().Format("2006-01-02 15:04:05"),
		"$__interval":            interval_string,
	}

	for macro, replacement := range simpleMacros {
		queryString = strings.ReplaceAll(queryString, macro, replacement)
	}

	return queryString
}
