package plugin

import (
	"database/sql"
	"errors"
	"fmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"time"
)

func initDataframeTypes(columnTypes []*sql.ColumnType, columnNames []string, frame *data.Frame) (*data.Frame, error) {
	for i := 0; i < len(columnTypes); i++ {

		cName := columnNames[i]
		switch cType := columnTypes[i].DatabaseTypeName(); cType {
		case "BIGINT":
			frame.Fields = append(frame.Fields,
				data.NewField(cName, nil, []int64{}),
			)
		case "BOOLEAN":
			frame.Fields = append(frame.Fields,
				data.NewField(cName, nil, []bool{}),
			)
		case "DATE":
			frame.Fields = append(frame.Fields,
				data.NewField(cName, nil, []string{}),
			)
		case "DOUBLE":
			frame.Fields = append(frame.Fields,
				data.NewField(cName, nil, []float64{}),
			)
		case "FLOAT":
			frame.Fields = append(frame.Fields,
				data.NewField(cName, nil, []float64{}),
			)
		case "INT":
			frame.Fields = append(frame.Fields,
				data.NewField(cName, nil, []int32{}),
			)
		case "SMALLINT":
			frame.Fields = append(frame.Fields,
				data.NewField(cName, nil, []int16{}),
			)
		case "STRING":
			frame.Fields = append(frame.Fields,
				data.NewField(cName, nil, []string{}),
			)
		case "TIMESTAMP":
			frame.Fields = append(frame.Fields,
				data.NewField(cName, nil, []time.Time{}),
			)
		case "TINYINT":
			frame.Fields = append(frame.Fields,
				data.NewField(cName, nil, []int8{}),
			)
		default:
			err := errors.New(fmt.Sprintf("Unsuported Type %s for column %s", cType, cName))
			log.DefaultLogger.Info("Unsuported Type", "err", err)
			return frame, err
		}

	}
	return frame, nil
}
