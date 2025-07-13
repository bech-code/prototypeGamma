import React, { useLayoutEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';

interface AmChartsBarProps {
    data: any[];
    categoryField: string;
    valueField: string;
    title?: string;
    color?: string;
    height?: number | string;
}

const AmChartsBar: React.FC<AmChartsBarProps> = ({ data, categoryField, valueField, title, color = '#3B82F6', height = 300 }) => {
    const chartRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!chartRef.current) return;
        const root = am5.Root.new(chartRef.current);
        root.setThemes([am5themes_Animated.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: false,
                panY: false,
                wheelX: 'none',
                wheelY: 'none',
                layout: root.verticalLayout
            })
        );

        if (title) {
            chart.children.unshift(
                am5.Label.new(root, {
                    text: title,
                    fontSize: 20,
                    fontWeight: 'bold',
                    centerX: am5.p50,
                    x: am5.p50,
                    paddingBottom: 10
                })
            );
        }

        // Axes (inversés pour barres horizontales)
        const yAxis = chart.yAxes.push(
            am5xy.CategoryAxis.new(root, {
                categoryField,
                renderer: am5xy.AxisRendererY.new(root, {}),
                tooltip: am5.Tooltip.new(root, {})
            })
        );
        yAxis.data.setAll(data);

        const xAxis = chart.xAxes.push(
            am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererX.new(root, {})
            })
        );

        // Série de données
        const series = chart.series.push(
            am5xy.ColumnSeries.new(root, {
                name: title || 'Série',
                xAxis,
                yAxis,
                valueXField: valueField,
                categoryYField: categoryField,
                tooltip: am5.Tooltip.new(root, {
                    labelText: `{${valueField}} demandes`
                })
            })
        );
        series.columns.template.setAll({
            height: am5.percent(90),
            tooltipY: 0,
            strokeOpacity: 0,
            fill: am5.color(color)
        });
        series.data.setAll(data);

        // Animation
        series.appear(1000);
        chart.appear(1000, 100);

        return () => {
            root.dispose();
        };
    }, [data, categoryField, valueField, title, color, height]);

    return <div style={{ width: '100%', height }} ref={chartRef} />;
};

export default AmChartsBar; 