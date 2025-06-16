document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const csvSelect = document.getElementById('csv-select');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const globalSearchBtn = document.getElementById('global-search-btn');
    const searchModeText = document.getElementById('search-mode-text');
    const excitementFilter = document.getElementById('excitement-filter');
    const tableBody = document.getElementById('table-body');
    const noResults = document.getElementById('no-results');
    const loading = document.getElementById('loading');
    const sortIcons = document.querySelectorAll('.sort-icon');
    const themeToggle = document.getElementById('theme-toggle');

    // State
    let animeData = [];         // Current selected CSV data
    let allAnimeData = {};      // All CSV data with filename as key
    let filteredData = [];      // Currently displayed data
    let currentSort = {
        column: null,
        direction: 'asc'
    };
    let globalSearchActive = false; // Flag to track if global search is active
    let globalSearchModeEnabled = false; // Flag to track if global search mode is enabled

    // Initialize
    resetTableHeaders();
    loadCSVList();
    initTheme();

    // Event Listeners
    csvSelect.addEventListener('change', loadSelectedCSV);
    searchBtn.addEventListener('click', function() {
        // Add pulse animation for visual feedback
        searchBtn.classList.add('btn-pulse');
        
        // Remove the animation class after the search completes
        setTimeout(() => {
            searchBtn.classList.remove('btn-pulse');
        }, 1000);
        
        filterData();
    });
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            // Add pulse animation for visual feedback
            searchBtn.classList.add('btn-pulse');
            
            // Remove the animation class after the search completes
            setTimeout(() => {
                searchBtn.classList.remove('btn-pulse');
            }, 1000);
            
            filterData();
        }
    });
    globalSearchBtn.addEventListener('click', toggleGlobalSearch);
    excitementFilter.addEventListener('change', filterData);
    
    sortIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const column = icon.getAttribute('data-column');
            sortData(column);
        });
    });

    // Theme switcher
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });

    /**
     * Toggle global search mode
     */
    function toggleGlobalSearch() {
        globalSearchModeEnabled = !globalSearchModeEnabled;
        
        // Add pulse animation for visual feedback
        globalSearchBtn.classList.add('btn-pulse');
        
        // Remove the animation class after the toggle completes
        setTimeout(() => {
            globalSearchBtn.classList.remove('btn-pulse');
        }, 1000);
        
        // Update button appearance
        if (globalSearchModeEnabled) {
            globalSearchBtn.classList.add('active');
            searchModeText.textContent = 'Searching across all videos';
            searchInput.placeholder = 'Search anime titles or notes across all videos...';
        } else {
            globalSearchBtn.classList.remove('active');
            searchModeText.textContent = 'Searching in current video only';
            searchInput.placeholder = 'Search anime titles or notes...';
        }
        
        // Reset table structure
        resetTableHeaders();
        
        // Re-filter data with new search mode
        filterData();
    }
    
    /**
     * Reset table headers to ensure proper structure
     */
    function resetTableHeaders() {
        const tableHead = document.querySelector('#anime-table thead tr');
        
        // Get all column headers
        const columns = tableHead.querySelectorAll('th');
        
        // Keep only the first 4 standard columns (Title, Timestamp, Excitement, Notes)
        // and remove any Source columns
        for (let i = 4; i < columns.length; i++) {
            tableHead.removeChild(columns[i]);
        }
    }

    // Functions
    function initTheme() {
        // Check for saved theme preference or use device preference
        const savedTheme = localStorage.getItem('theme') || 
            (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.checked = true;
        }
    }

    async function loadCSVList() {
        loading.classList.remove('hidden');
        
        try {
            // Get list of CSV files from the config file
            const response = await fetch('csv_config.json');
            
            if (!response.ok) {
                throw new Error('Failed to load CSV configuration file');
            }
            
            const config = await response.json();
            const files = config.files || [];
            
            if (files.length === 0) {
                console.warn('No CSV files found in configuration');
            }
            
            populateSelect(files);
            
            // Load all CSV files in background
            await loadAllCSVFiles(files);
            
            // Load the first CSV by default for display
            if (files.length > 0) {
                csvSelect.value = files[0];
                loadSelectedCSV();
            }
        } catch (error) {
            console.error('Error loading CSV list:', error);
            
            // Fallback to hardcoded list
            const files = [
                'Fall 2024 Anime in a Nutshell_anime_references.csv'
            ];
            
            populateSelect(files);
            
            // Load the first CSV by default
            if (files.length > 0) {
                csvSelect.value = files[0];
                loadSelectedCSV();
            }
        } finally {
            hideLoading();
        }
    }
    
    async function loadAllCSVFiles(files) {
        try {
            const promises = files.map(async (file) => {
                try {
                    const response = await fetch(`transcripts/${file}`);
                    if (!response.ok) {
                        console.error(`Failed to load file: ${file}`);
                        return null;
                    }
                    
                    const csvText = await response.text();
                    const data = parseCSV(csvText);
                    
                    // Add source information to each item
                    const formattedData = data.map(item => {
                        const source = formatSource(file);
                        return { ...item, Source: source };
                    });
                    
                    return { file, data: formattedData };
                } catch (error) {
                    console.error(`Error loading ${file}:`, error);
                    return null;
                }
            });
            
            const results = await Promise.all(promises);
            
            // Process results
            results.forEach(result => {
                if (result) {
                    allAnimeData[result.file] = result.data;
                }
            });
            
            console.log(`Loaded ${Object.keys(allAnimeData).length} CSV files`);
        } catch (error) {
            console.error('Error loading CSV files:', error);
        }
    }
    
    function formatSource(filename) {
        // Format the display name from the filename
        let displayName = filename.replace('.csv', '');
        // Remove "_anime_references" from the name
        displayName = displayName.replace(/_anime_references/g, '');
        displayName = displayName.replace(/_/g, ' ');
        return displayName;
    }

    function populateSelect(files) {
        // Clear existing options
        csvSelect.innerHTML = '';
        
        // Sort files by year (descending) and season (Spring > Summer > Fall > Winter)
        const sortedFiles = [...files].sort((a, b) => {
            // Extract year and season from filenames
            const yearA = extractYear(a);
            const yearB = extractYear(b);
            const seasonA = extractSeason(a);
            const seasonB = extractSeason(b);
            
            // Compare years first (descending)
            if (yearB !== yearA) {
                return yearB - yearA;
            }
            
            // If years are the same, compare seasons
            return getSeasonOrder(seasonB) - getSeasonOrder(seasonA);
        });
        
        // Add options for each file
        sortedFiles.forEach(file => {
            const option = document.createElement('option');
            option.value = file;
            
            // Format the display name from the filename
            let displayName = file.replace('.csv', '');
            // Remove "_anime_references" from the name
            displayName = displayName.replace(/_anime_references/g, '');
            displayName = displayName.replace(/_/g, ' ');
            
            option.textContent = displayName;
            csvSelect.appendChild(option);
        });
    }

    // Helper function to extract year from filename
    function extractYear(filename) {
        const match = filename.match(/\b(20\d\d)\b/);
        return match ? parseInt(match[1]) : 0;
    }

    // Helper function to extract season from filename
    function extractSeason(filename) {
        const seasons = ['Spring', 'Summer', 'Fall', 'Winter'];
        for (const season of seasons) {
            if (filename.includes(season)) {
                return season;
            }
        }
        return '';
    }

    // Helper function to get season order (Spring: 3, Summer: 2, Fall: 1, Winter: 0)
    function getSeasonOrder(season) {
        const seasonOrder = {
            'Spring': 3,
            'Summer': 2,
            'Fall': 1, 
            'Winter': 0
        };
        
        return seasonOrder[season] || -1; // Return -1 for unknown seasons
    }

    async function loadSelectedCSV() {
        loading.classList.remove('hidden');
        tableBody.innerHTML = '';
        noResults.classList.add('hidden');
        
        // Reset global search only if global mode isn't enabled
        if (!globalSearchModeEnabled) {
            globalSearchActive = false;
        } else {
            globalSearchActive = true;
        }
        
        // Reset the table headers
        resetTableHeaders();
        
        const selectedFile = csvSelect.value;
        
        if (!selectedFile) {
            loading.classList.add('hidden');
            return;
        }
        
        try {
            // If we've already loaded this file, use the cached data
            if (allAnimeData[selectedFile]) {
                animeData = allAnimeData[selectedFile];
            } else {
                // Otherwise fetch and parse it
                const response = await fetch(`transcripts/${selectedFile}`);
                
                if (!response.ok) {
                    throw new Error(`Failed to load file: ${selectedFile}`);
                }
                
                const csvText = await response.text();
                const parsedData = parseCSV(csvText);
                
                // Add source information to each item
                animeData = parsedData.map(item => {
                    const source = formatSource(selectedFile);
                    return { ...item, Source: source };
                });
                
                // Cache the data
                allAnimeData[selectedFile] = animeData;
            }
            
            // Reset filters
            searchInput.value = '';
            excitementFilter.value = 'all';
            
            // Reset sort
            currentSort.column = null;
            currentSort.direction = 'asc';
            
            // Display data
            filteredData = [...animeData];
            renderTable(filteredData);
        } catch (error) {
            console.error('Error loading CSV:', error);
            tableBody.innerHTML = `<tr><td colspan="4">Error loading data: ${error.message}</td></tr>`;
        } finally {
            hideLoading();
        }
    }

    function parseCSV(csvText) {
        // Split the CSV text into lines
        const lines = csvText.split('\n');
        
        // Extract headers (first line)
        const headers = lines[0].split(',');
        
        // Parse data rows
        const data = lines.slice(1)
            .filter(line => line.trim() !== '')
            .map(line => {
                // Handle commas within quotes
                const values = [];
                let currentValue = '';
                let inQuotes = false;
                
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        values.push(currentValue);
                        currentValue = '';
                    } else {
                        currentValue += char;
                    }
                }
                
                // Add the last value
                values.push(currentValue);
                
                // Create an object from the headers and values
                const row = {};
                headers.forEach((header, index) => {
                    row[header.trim()] = values[index]?.trim() || '';
                });
                
                return row;
            });
        
        return data;
    }

    function filterData() {
        const searchTerm = searchInput.value.toLowerCase();
        const excitementLevel = excitementFilter.value;
        
        // Determine if we should do global search based on search term and global mode
        // Global search is active if: global mode is enabled OR search term is non-empty and global mode is enabled
        const shouldDoGlobalSearch = globalSearchModeEnabled;
        
        if (shouldDoGlobalSearch) {
            globalSearchActive = true;
            
            // Combine all anime data from all CSV files
            let combinedData = [];
            for (const filename in allAnimeData) {
                combinedData = combinedData.concat(allAnimeData[filename]);
            }
            
            filteredData = combinedData.filter(anime => {
                // Filter by search term if there is one
                const matchesSearch = searchTerm.length === 0 || 
                    anime['Anime Title']?.toLowerCase().includes(searchTerm) ||
                    anime['Notes']?.toLowerCase().includes(searchTerm);
                
                // Filter by excitement level
                const matchesExcitement = 
                    excitementLevel === 'all' || 
                    (anime['Gigguk Excited?'] && anime['Gigguk Excited?'].includes(excitementLevel));
                
                return matchesSearch && matchesExcitement;
            });
        } else {
            // Only filter the current selected CSV
            globalSearchActive = false;
            
            filteredData = animeData.filter(anime => {
                // Filter by search term if there is one
                const matchesSearch = searchTerm.length === 0 || 
                    anime['Anime Title']?.toLowerCase().includes(searchTerm) ||
                    anime['Notes']?.toLowerCase().includes(searchTerm);
                
                // Filter by excitement level
                const matchesExcitement = 
                    excitementLevel === 'all' || 
                    (anime['Gigguk Excited?'] && anime['Gigguk Excited?'].includes(excitementLevel));
                
                return matchesSearch && matchesExcitement;
            });
        }
        
        // Apply current sort if any
        if (currentSort.column) {
            sortDataByCurrentSort();
        }
        
        renderTable(filteredData);
    }

    function sortData(column) {
        // Update sort direction
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'asc';
        }
        
        // Update UI
        sortIcons.forEach(icon => {
            const iconColumn = icon.getAttribute('data-column');
            const iconElement = icon.querySelector('i');
            
            if (iconColumn === column) {
                iconElement.className = currentSort.direction === 'asc' 
                    ? 'fas fa-sort-up' 
                    : 'fas fa-sort-down';
            } else {
                iconElement.className = 'fas fa-sort';
            }
        });
        
        sortDataByCurrentSort();
        renderTable(filteredData);
    }

    function sortDataByCurrentSort() {
        const column = currentSort.column;
        const direction = currentSort.direction;
        
        if (!column) return;
        
        filteredData.sort((a, b) => {
            let valueA, valueB;
            
            if (column === 'title') {
                valueA = a['Anime Title'] || '';
                valueB = b['Anime Title'] || '';
            } else if (column === 'timestamp') {
                // Convert timestamp to seconds for sorting
                valueA = convertTimestampToSeconds(a['Timestamp'] || '0:00');
                valueB = convertTimestampToSeconds(b['Timestamp'] || '0:00');
                return direction === 'asc' ? valueA - valueB : valueB - valueA;
            } else if (column === 'excited') {
                valueA = a['Gigguk Excited?'] || '';
                valueB = b['Gigguk Excited?'] || '';
            } else if (column === 'source') {
                valueA = a['Source'] || '';
                valueB = b['Source'] || '';
            }
            
            // String comparison for non-numeric values
            if (direction === 'asc') {
                return valueA.localeCompare(valueB);
            } else {
                return valueB.localeCompare(valueA);
            }
        });
    }

    function convertTimestampToSeconds(timestamp) {
        const parts = timestamp.split(':');
        if (parts.length === 2) {
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        } else if (parts.length === 3) {
            return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
        }
        return 0;
    }

    function renderTable(data) {
        tableBody.innerHTML = '';
        
        // Update the search mode indicator
        if (globalSearchActive) {
            searchModeText.textContent = 'Searching across all videos';
            if (globalSearchModeEnabled) {
                globalSearchBtn.classList.add('active');
            }
        } else {
            searchModeText.textContent = 'Searching in current video only';
            globalSearchBtn.classList.remove('active');
        }
        
        if (data.length === 0) {
            noResults.classList.remove('hidden');
            // Update the no results message based on global search status
            if (globalSearchActive) {
                noResults.innerHTML = '<p>No results found across all videos. Try a different search term or check different filters.</p>';
            } else {
                noResults.innerHTML = '<p>No results found in the current video. Try a different search term or check different filters.</p>';
            }
            return;
        }
        
        noResults.classList.add('hidden');
        
        // Update table headers based on global search mode - first clear out any existing Source columns
        const tableHead = document.querySelector('#anime-table thead tr');
        
        // Remove ALL existing Source column headers (to fix the duplicate issue)
        const existingSourceColumns = tableHead.querySelectorAll('th[data-column="source"]');
        existingSourceColumns.forEach(column => {
            tableHead.removeChild(column);
        });
        
        // Now add a single Source column if we're in global search mode
        if (globalSearchActive) {
            // Add Source column header
            const sourceHeader = document.createElement('th');
            sourceHeader.setAttribute('data-column', 'source'); // Add data-column attribute
            sourceHeader.innerHTML = 'Source <span class="sort-icon" data-column="source"><i class="fas fa-sort"></i></span>';
            tableHead.appendChild(sourceHeader);
            
            // Add event listener to the new sort icon
            const sourceIcon = sourceHeader.querySelector('.sort-icon');
            sourceIcon.addEventListener('click', () => {
                const column = sourceIcon.getAttribute('data-column');
                sortData(column);
            });
        }
        
        data.forEach(anime => {
            const row = document.createElement('tr');
            
            // Anime Title
            const titleCell = document.createElement('td');
            titleCell.textContent = anime['Anime Title'] || '';
            row.appendChild(titleCell);
            
            // Timestamp
            const timestampCell = document.createElement('td');
            const timestamp = document.createElement('span');
            timestamp.className = 'timestamp';
            timestamp.textContent = anime['Timestamp'] || '';
            timestampCell.appendChild(timestamp);
            row.appendChild(timestampCell);
            
            // Excitement Level
            const excitementCell = document.createElement('td');
            const excitement = anime['Gigguk Excited?'] || '';
            
            let excitementClass = '';
            if (excitement.toLowerCase().includes('yes')) {
                excitementClass = 'excitement-yes';
            } else if (excitement.toLowerCase().includes('neutral')) {
                excitementClass = 'excitement-neutral';
            } else if (excitement.toLowerCase().includes('no')) {
                excitementClass = 'excitement-no';
            }
            
            excitementCell.textContent = excitement;
            excitementCell.className = excitementClass;
            row.appendChild(excitementCell);
            
            // Notes
            const notesCell = document.createElement('td');
            notesCell.textContent = anime['Notes'] || '';
            row.appendChild(notesCell);
            
            // Source (only show when in global search mode)
            if (globalSearchActive) {
                const sourceCell = document.createElement('td');
                sourceCell.textContent = anime['Source'] || '';
                sourceCell.className = 'source-cell';
                row.appendChild(sourceCell);
            }
            
            tableBody.appendChild(row);
        });
    }

    function hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }
});