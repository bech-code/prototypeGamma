import React, { useLayoutEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';

interface AmChartsPieProps {
    data: any[];
    categoryField: string;
    valueField: string;
    title?: string;
    colors?: string[];
    height?: number | string;
}

const AmChartsPie: React.FC<AmChartsPieProps> = ({ data, categoryField, valueField, title, colors, height = 300 }) => {
    const chartRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!chartRef.current) return;
        const root = am5.Root.new(chartRef.current);
        root.setThemes([am5themes_Animated.new(root)]);

        const chart = root.container.children.push(
            am5percent.PieChart.new(root, {
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

        const series = chart.series.push(
            am5percent.PieSeries.new(root, {
                name: title || 'Série',
                categoryField,
                valueField,
                legendLabelText: `{${categoryField}}`,
                legendValueText: `{${valueField}} demandes`
            })
        );
        series.data.setAll(data);
        series.labels.template.set('text', `{${categoryField}}\n{${valueField}} demandes`);
        series.slices.template.set('tooltipText', `{${categoryField}}: {${valueField}} demandes ({valuePercentTotal.formatNumber('#.0')}%)`);

        // Couleurs personnalisées
        if (colors && colors.length > 0) {
            series.get('colors').set('colors', colors.map(c => am5.color(c)));
        }

        // Légende
        const legend = chart.children.push(
            am5.Legend.new(root, {
                centerX: am5.p50,
                x: am5.p50,
                marginTop: 15,
                marginBottom: 15
            })
        );
        legend.data.setAll(series.dataItems);

        // Animation
        series.appear(1000);
        chart.appear(1000, 100);

        return () => {
            root.dispose();
        };
    }, [data, categoryField, valueField, title, colors, height]);

    return <div style={{ width: '100%', height }} ref={chartRef} />;
};

export default AmChartsPie;
