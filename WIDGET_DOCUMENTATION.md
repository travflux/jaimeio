# Hambry Horoscope Widget

The Hambry Horoscope Widget is an embeddable, white-label horoscope display component that allows your clients to add daily horoscope readings to their websites. The widget is lightweight, customizable, and requires minimal integration effort.

## Features

- **Multiple Display Modes**: Carousel (one sign at a time), Grid (all signs), or List (scrollable)
- **Theme Support**: Light and dark themes that match your client's branding
- **Flexible Sign Selection**: Show all 12 zodiac signs or a custom subset
- **Auto-Refresh**: Optional automatic horoscope refresh at configurable intervals
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Zero Dependencies**: Pure JavaScript, no external libraries required
- **XSS Protection**: Built-in HTML escaping for security

## Installation

### 1. Add the Widget Script

Include the widget script in your HTML page:

```html
<div id="hambry-horoscope-widget"></div>
<script src="https://your-hambry-domain.com/horoscope-widget.js"></script>
```

### 2. Initialize the Widget

```html
<script>
  HambryHoroscope.init({
    containerId: 'hambry-horoscope-widget',
    apiUrl: 'https://your-hambry-domain.com/api/trpc',
    theme: 'light',
    displayMode: 'carousel'
  });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `containerId` | string | `'hambry-horoscope-widget'` | HTML element ID where widget will be rendered |
| `apiUrl` | string | *(required)* | Base URL of your Hambry API (e.g., `https://your-domain.com/api/trpc`) |
| `theme` | string | `'light'` | Color theme: `'light'` or `'dark'` |
| `displayMode` | string | `'carousel'` | How to display horoscopes: `'carousel'`, `'grid'`, or `'list'` |
| `signs` | array | `null` | Optional array of zodiac signs to display (e.g., `['aries', 'taurus', 'gemini']`). If null, shows all 12 signs |
| `autoRefresh` | boolean | `false` | Enable automatic horoscope refresh |
| `refreshInterval` | number | `3600000` | Refresh interval in milliseconds (default: 1 hour) |

## Display Modes

### Carousel Mode
Shows one zodiac sign at a time with navigation buttons. Perfect for limited space.

```html
<script>
  HambryHoroscope.init({
    containerId: 'hambry-horoscope-widget',
    apiUrl: 'https://your-hambry-domain.com/api/trpc',
    displayMode: 'carousel'
  });
</script>
```

### Grid Mode
Displays all horoscopes in a responsive grid layout. Great for full-width sections.

```html
<script>
  HambryHoroscope.init({
    containerId: 'hambry-horoscope-widget',
    apiUrl: 'https://your-hambry-domain.com/api/trpc',
    displayMode: 'grid'
  });
</script>
```

### List Mode
Shows all horoscopes in a vertical list. Ideal for sidebars or narrow columns.

```html
<script>
  HambryHoroscope.init({
    containerId: 'hambry-horoscope-widget',
    apiUrl: 'https://your-hambry-domain.com/api/trpc',
    displayMode: 'list'
  });
</script>
```

## Theme Support

### Light Theme
```html
<script>
  HambryHoroscope.init({
    containerId: 'hambry-horoscope-widget',
    apiUrl: 'https://your-hambry-domain.com/api/trpc',
    theme: 'light'
  });
</script>
```

### Dark Theme
```html
<script>
  HambryHoroscope.init({
    containerId: 'hambry-horoscope-widget',
    apiUrl: 'https://your-hambry-domain.com/api/trpc',
    theme: 'dark'
  });
</script>
```

## Filtering by Zodiac Signs

Show only specific zodiac signs:

```html
<script>
  HambryHoroscope.init({
    containerId: 'hambry-horoscope-widget',
    apiUrl: 'https://your-hambry-domain.com/api/trpc',
    signs: ['aries', 'taurus', 'gemini', 'cancer']
  });
</script>
```

Available sign values:
- `aries`, `taurus`, `gemini`, `cancer`, `leo`, `virgo`
- `libra`, `scorpio`, `sagittarius`, `capricorn`, `aquarius`, `pisces`

## Auto-Refresh

Enable automatic horoscope updates:

```html
<script>
  HambryHoroscope.init({
    containerId: 'hambry-horoscope-widget',
    apiUrl: 'https://your-hambry-domain.com/api/trpc',
    autoRefresh: true,
    refreshInterval: 1800000 // Refresh every 30 minutes
  });
</script>
```

## Complete Examples

### Example 1: Sidebar Widget (Carousel, Light Theme)
```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <div class="sidebar">
    <div id="horoscope-widget"></div>
  </div>

  <script src="https://your-hambry-domain.com/horoscope-widget.js"></script>
  <script>
    HambryHoroscope.init({
      containerId: 'horoscope-widget',
      apiUrl: 'https://your-hambry-domain.com/api/trpc',
      theme: 'light',
      displayMode: 'carousel'
    });
  </script>
</body>
</html>
```

### Example 2: Full-Width Section (Grid, Dark Theme)
```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
  <style>
    .horoscope-section {
      background: #1f2937;
      padding: 40px 20px;
      margin: 40px 0;
    }
  </style>
</head>
<body>
  <div class="horoscope-section">
    <div id="daily-horoscopes"></div>
  </div>

  <script src="https://your-hambry-domain.com/horoscope-widget.js"></script>
  <script>
    HambryHoroscope.init({
      containerId: 'daily-horoscopes',
      apiUrl: 'https://your-hambry-domain.com/api/trpc',
      theme: 'dark',
      displayMode: 'grid'
    });
  </script>
</body>
</html>
```

### Example 3: Filtered Signs (List, Auto-Refresh)
```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <div id="my-horoscope"></div>

  <script src="https://your-hambry-domain.com/horoscope-widget.js"></script>
  <script>
    HambryHoroscope.init({
      containerId: 'my-horoscope',
      apiUrl: 'https://your-hambry-domain.com/api/trpc',
      theme: 'light',
      displayMode: 'list',
      signs: ['aries', 'taurus', 'gemini'],
      autoRefresh: true,
      refreshInterval: 3600000 // Refresh hourly
    });
  </script>
</body>
</html>
```

## Styling Customization

The widget uses CSS classes that can be overridden. Here's how to customize the appearance:

```html
<style>
  /* Override widget container */
  .hambry-horoscope-widget {
    max-width: 800px;
    padding: 30px;
  }

  /* Override light theme */
  .hambry-theme-light {
    background: #f5f5f5;
    color: #333;
  }

  /* Override dark theme */
  .hambry-theme-dark {
    background: #1a1a1a;
    color: #eee;
  }

  /* Override horoscope items */
  .horoscope-item {
    border-radius: 12px;
    padding: 24px;
  }

  /* Override horoscope sign heading */
  .horoscope-sign {
    font-size: 18px;
    color: #6366f1;
  }
</style>
```

## API Endpoint

The widget communicates with the following tRPC endpoint:

**Endpoint**: `POST /api/trpc/horoscopes.widget`

**Parameters**:
- `date` (optional): YYYY-MM-DD format. Defaults to today's date.
- `signs` (optional): Array of zodiac sign strings to filter results.

**Response**:
```json
{
  "result": {
    "data": [
      {
        "id": 1,
        "date": "2026-02-19",
        "sign": "aries",
        "content": "Today brings new opportunities...",
        "styleId": "mystical",
        "createdAt": "2026-02-19T10:30:00Z"
      },
      ...
    ]
  }
}
```

## Browser Compatibility

The widget works on all modern browsers:
- Chrome/Edge 60+
- Firefox 55+
- Safari 11+
- Mobile browsers (iOS Safari, Chrome Android)

## Security

- **XSS Protection**: All horoscope content is HTML-escaped before rendering
- **HTTPS Only**: Widget should be served over HTTPS in production
- **CORS**: Widget respects browser CORS policies for API requests
- **No Sensitive Data**: Widget does not store or transmit user information

## Troubleshooting

### Widget not appearing
1. Verify the container element exists with the correct ID
2. Check browser console for JavaScript errors
3. Ensure `apiUrl` is correct and accessible

### Horoscopes not loading
1. Verify the API URL is correct
2. Check browser Network tab for failed requests
3. Ensure horoscopes exist in the database for today's date
4. Check that CORS is properly configured on the API

### Styling issues
1. Check for CSS conflicts with your site's stylesheet
2. Use browser DevTools to inspect element styles
3. Override specific classes if needed

## Support

For issues or feature requests, contact the Hambry team at support@hambry.com

## License

The Hambry Horoscope Widget is provided as part of your white-label license agreement. Redistribution or modification without permission is prohibited.
