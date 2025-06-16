# Changelog

All notable changes to the Gigguk Anime Recommendations project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-06-16

### Added
- Global search functionality to search across all video CSV files simultaneously
- "All Videos" toggle button with visual feedback for enabling/disabling global search
- Source column in search results to show which video each anime recommendation is from
- Dynamic table header management that adds/removes the Source column based on search mode
- Search mode indicator that shows whether you're searching in the current video or across all videos
- Enhanced button styling with hover effects, animations, and active states
- Pulse animation effect for both search buttons
- Custom styling for the Source column
- Better mobile responsiveness for the search UI

### Changed
- Improved search UX with clearer button labels and visual indicators
- Updated no-results messages to be more descriptive based on search context
- Enhanced search input placeholder text that updates based on search mode
- Optimized data loading to cache CSV files for faster searches
- Refined responsive design for mobile devices

### Fixed
- Issue with duplicate Source columns appearing in global search mode
- Table structure consistency when switching between search modes
- Search button alignment and styling on mobile devices

## [1.0.0] - 2025-05-04

### Added
- Initial release of the Gigguk Anime Recommendations application
- Web interface for browsing anime recommendations from Gigguk's videos
- CSV-based data storage for anime references
- Ability to select different Gigguk "Anime in a Nutshell" videos
- Filter functionality by excitement level (Excited, Neutral, Not Excited)
- Basic search functionality within a single selected video
- Sortable columns for anime titles, timestamps, and excitement levels
- Dark/light mode toggle with system preference detection
- Responsive design for desktop and mobile devices
- Loading animation for better user experience
- YouTube links to original Gigguk videos
- Timestamp formatting for easy reference

### Technical
- CSV parsing with support for quoted values and commas within fields
- Dynamic loading of CSV configuration from json file
- Smart sorting for seasons and years in the video selector
- CSS variables for consistent theming
- Font Awesome integration for icons
- Event handling for search, filter, and sort operations
