# 📊 Guide amCharts 5 - Statistiques DepanneTeliman

## 🎯 Vue d'ensemble

Ce guide explique l'utilisation d'amCharts 5 dans la page de statistiques du projet DepanneTeliman, remplaçant Recharts pour des graphiques plus avancés et interactifs.

## 🚀 Installation

### Package installé
```bash
npm install @amcharts/amcharts5
```

### Imports nécessaires
```typescript
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import * as am5percent from '@amcharts/amcharts5/percent';
import * as am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
```

## 📈 Types de graphiques implémentés

### 1. Graphique linéaire (LineChart)
**Utilisation** : Évolution des demandes sur 7 jours

```typescript
// Configuration
const chart = root.container.children.push(
  am5xy.XYChart.new(root, {
    panX: false,
    panY: false,
    wheelX: "none",
    wheelY: "none",
    layout: root.verticalLayout
  })
);

// Axes
const xAxis = chart.xAxes.push(
  am5xy.CategoryAxis.new(root, {
    categoryField: "date",
    renderer: am5xy.AxisRendererX.new(root, {}),
    tooltip: am5.Tooltip.new(root, {})
  })
);

const yAxis = chart.yAxes.push(
  am5xy.ValueAxis.new(root, {
    renderer: am5xy.AxisRendererY.new(root, {})
  })
);

// Série de données
const series = chart.series.push(
  am5xy.LineSeries.new(root, {
    name: "Demandes",
    xAxis: xAxis,
    yAxis: yAxis,
    valueYField: "demandes",
    categoryXField: "date",
    tooltip: am5.Tooltip.new(root, {
      labelText: "{valueY} demandes"
    })
  })
);

// Points sur la ligne
series.bullets.push(() => {
  return am5.Bullet.new(root, {
    sprite: am5.Circle.new(root, {
      radius: 5,
      fill: series.get("fill")
    })
  });
});
```

### 2. Graphique circulaire (PieChart)
**Utilisation** : Répartition par spécialité

```typescript
// Configuration
const chart = root.container.children.push(
  am5percent.PieChart.new(root, {
    layout: root.verticalLayout
  })
);

// Série de données
const series = chart.series.push(
  am5percent.PieSeries.new(root, {
    name: "Spécialités",
    categoryField: "specialty",
    valueField: "value",
    legendLabelText: "{category}",
    legendValueText: "{value} demandes"
  })
);

// Labels et tooltips
series.labels.template.set("text", "{category}\n{value} demandes");
series.slices.template.set("tooltipText", "{category}: {value} demandes ({valuePercentTotal.formatNumber('#.0')}%)");

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
```

### 3. Graphique en barres horizontales (ColumnSeries)
**Utilisation** : Top villes par activité

```typescript
// Configuration
const chart = root.container.children.push(
  am5xy.XYChart.new(root, {
    panX: false,
    panY: false,
    wheelX: "none",
    wheelY: "none",
    layout: root.verticalLayout
  })
);

// Axes (inversés pour barres horizontales)
const yAxis = chart.yAxes.push(
  am5xy.CategoryAxis.new(root, {
    categoryField: "city",
    renderer: am5xy.AxisRendererY.new(root, {}),
    tooltip: am5.Tooltip.new(root, {})
  })
);

const xAxis = chart.xAxes.push(
  am5xy.ValueAxis.new(root, {
    renderer: am5xy.AxisRendererX.new(root, {})
  })
);

// Série de données
const series = chart.series.push(
  am5xy.ColumnSeries.new(root, {
    name: "Demandes",
    xAxis: xAxis,
    yAxis: yAxis,
    valueXField: "demandes",
    categoryYField: "city",
    tooltip: am5.Tooltip.new(root, {
      labelText: "{valueX} demandes"
    })
  })
);

// Style des barres
series.columns.template.setAll({
  height: am5.percent(90),
  tooltipY: 0,
  strokeOpacity: 0
});
```

## 🎨 Thèmes et personnalisation

### Thème animé
```typescript
root.setThemes([am5themes_Animated.new(root)]);
```

### Couleurs personnalisées
```typescript
// Couleurs par défaut amCharts 5
const colors = [
  am5.color(0x3B82F6), // Bleu
  am5.color(0x10B981), // Vert
  am5.color(0xF59E0B), // Jaune
  am5.color(0xEF4444), // Rouge
  am5.color(0x8B5CF6), // Violet
  am5.color(0x06B6D4)  // Cyan
];
```

### Styles de conteneur
```typescript
// Responsive container
<div ref={chartRef} style={{ width: "100%", height: "300px" }}></div>
```

## 🔧 Gestion du cycle de vie

### Création et destruction
```typescript
useEffect(() => {
  if (!data || !chartRef.current) return;

  const root = am5.Root.new(chartRef.current);
  // Configuration du graphique...

  return () => {
    root.dispose(); // Important pour éviter les fuites mémoire
  };
}, [data]);
```

### Mise à jour des données
```typescript
// Les données sont automatiquement mises à jour quand elles changent
series.data.setAll(newData);
```

## 📊 Fonctionnalités avancées

### Tooltips interactifs
```typescript
tooltip: am5.Tooltip.new(root, {
  labelText: "{valueY} demandes",
  getFillFromSprite: false,
  labelFill: am5.color(0xffffff)
})
```

### Animations
```typescript
// Animations automatiques avec le thème Animated
// Possibilité d'ajouter des animations personnalisées
series.appear(1000, 100);
```

### Zoom et pan
```typescript
// Désactivé par défaut pour une meilleure UX
panX: false,
panY: false,
wheelX: "none",
wheelY: "none"
```

### Légendes interactives
```typescript
const legend = chart.children.push(
  am5.Legend.new(root, {
    centerX: am5.p50,
    x: am5.p50,
    marginTop: 15,
    marginBottom: 15
  })
);
legend.data.setAll(series.dataItems);
```

## 🎯 Avantages d'amCharts 5

### Performance
- **Rendu SVG/Canvas** : Performances optimales
- **Animations fluides** : 60 FPS garantis
- **Gestion mémoire** : Pas de fuites mémoire

### Interactivité
- **Tooltips avancés** : Personnalisables
- **Zoom/Pan** : Navigation intuitive
- **Légendes interactives** : Clic pour masquer/afficher

### Personnalisation
- **Thèmes** : Animated, Material, etc.
- **Couleurs** : Palette complète
- **Styles** : CSS-like styling

### Compatibilité
- **TypeScript** : Support natif
- **React** : Intégration parfaite
- **Responsive** : Adaptation automatique

## 🔧 Configuration recommandée

### Structure des données
```typescript
interface ChartData {
  date: string;
  demandes: number;
  // Autres champs selon le type de graphique
}
```

### Gestion des erreurs
```typescript
useEffect(() => {
  if (!data || !chartRef.current) return;

  try {
    const root = am5.Root.new(chartRef.current);
    // Configuration...
  } catch (error) {
    console.error('Erreur lors de la création du graphique:', error);
  }

  return () => {
    if (root) root.dispose();
  };
}, [data]);
```

### Optimisation des performances
```typescript
// Éviter les re-renders inutiles
const chartRef = useRef<HTMLDivElement>(null);
const [chartData, setChartData] = useState<ChartData[]>([]);

// Mettre à jour seulement quand les données changent
useEffect(() => {
  if (JSON.stringify(chartData) !== JSON.stringify(data)) {
    setChartData(data);
  }
}, [data]);
```

## 📱 Responsive Design

### Adaptation automatique
```typescript
// amCharts 5 s'adapte automatiquement à la taille du conteneur
<div ref={chartRef} style={{ width: "100%", height: "300px" }}></div>
```

### Breakpoints personnalisés
```typescript
// Possibilité d'ajuster la configuration selon la taille d'écran
const isMobile = window.innerWidth < 768;

if (isMobile) {
  // Configuration mobile
  chart.set("layout", root.horizontalLayout);
} else {
  // Configuration desktop
  chart.set("layout", root.verticalLayout);
}
```

## 🎨 Exemples de personnalisation

### Graphique avec gradient
```typescript
series.fills.template.setAll({
  fillGradient: am5.LinearGradient.new(root, {
    stops: [{
      color: am5.color(0x3B82F6)
    }, {
      color: am5.color(0x1E40AF)
    }]
  })
});
```

### Animation d'apparition
```typescript
series.appear(1000, 100);
series.bullets.each((bullet, index) => {
  bullet.animate({
    key: "scaleX",
    to: 1,
    from: 0,
    duration: 1000,
    delay: index * 100
  });
});
```

---

*Ce guide couvre l'utilisation d'amCharts 5 dans le projet DepanneTeliman. Pour plus d'informations, consultez la [documentation officielle amCharts 5](https://www.amcharts.com/docs/v5/).* 