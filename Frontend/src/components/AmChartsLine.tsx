import React, { useLayoutEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';

interface AmChartsLineProps {
    data: any[];
    categoryField: string;
    valueField: string;
    title?: string;
    color?: string;
    height?: number | string;
}

const AmChartsLine: React.FC<AmChartsLineProps> = ({ data, categoryField, valueField, title, color = '#3B82F6', height = 300 }) => {
    const chartRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!chartRef.current) return;
        let root = am5.Root.new(chartRef.current);
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

        // Axes
        const xAxis = chart.xAxes.push(
            am5xy.CategoryAxis.new(root, {
                categoryField,
                renderer: am5xy.AxisRendererX.new(root, {}),
                tooltip: am5.Tooltip.new(root, {})
            })
        );
        xAxis.data.setAll(data);

        const yAxis = chart.yAxes.push(
            am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererY.new(root, {})
            })
        );

        // Série
        const series = chart.series.push(
            am5xy.LineSeries.new(root, {
                name: title || 'Série',
                xAxis,
                yAxis,
                valueYField: valueField,
                categoryXField: categoryField,
                tooltip: am5.Tooltip.new(root, {
                    labelText: `{${valueField}}`
                })
            })
        );
        series.strokes.template.setAll({ stroke: am5.color(color), strokeWidth: 3 });
        series.fills.template.setAll({ fill: am5.color(color), fillOpacity: 0.15 });
        series.data.setAll(data);

        // Bullets
        series.bullets.push(() => {
            return am5.Bullet.new(root, {
                sprite: am5.Circle.new(root, {
                    radius: 5,
                    fill: series.get('fill')
                })
            });
        });

        // Animation
        series.appear(1000);
        chart.appear(1000, 100);

        return () => {
            root.dispose();
        };
    }, [data, categoryField, valueField, title, color]);

    return <div style={{ width: '100%', height }} ref={chartRef} />;
};

export default AmChartsLine; 