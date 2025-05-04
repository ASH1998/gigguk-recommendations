document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const csvSelect = document.getElementById('csv-select');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const excitementFilter = document.getElementById('excitement-filter');
    const tableBody = document.getElementById('table-body');
    const noResults = document.getElementById('no-results');
    const loading = document.getElementById('loading');
    const sortIcons = document.querySelectorAll('.sort-icon');
    const themeToggle = document.getElementById('theme-toggle');

    // State
    let animeData = [];
    let filteredData = [];
    let currentSort = {
        column: null,
        direction: 'asc'
    };

    // Initialize
    loadCSVList();
    initTheme();

    // Event Listeners
    csvSelect.addEventListener('change', loadSelectedCSV);
    searchBtn.addEventListener('click', filterData);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') filterData();
    });
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
            
            // Load the first CSV by default
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
        
        const selectedFile = csvSelect.value;
        
        if (!selectedFile) {
            loading.classList.add('hidden');
            return;
        }
        
        try {
            const response = await fetch(`transcripts/${selectedFile}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load file: ${selectedFile}`);
            }
            
            const csvText = await response.text();
            animeData = parseCSV(csvText);
            
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
        
        filteredData = animeData.filter(anime => {
            // Filter by search term
            const matchesSearch = 
                anime['Anime Title']?.toLowerCase().includes(searchTerm) ||
                anime['Notes']?.toLowerCase().includes(searchTerm);
            
            // Filter by excitement level
            const matchesExcitement = 
                excitementLevel === 'all' || 
                (anime['Gigguk Excited?'] && anime['Gigguk Excited?'].includes(excitementLevel));
            
            return matchesSearch && matchesExcitement;
        });
        
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
        
        if (data.length === 0) {
            noResults.classList.remove('hidden');
            return;
        }
        
        noResults.classList.add('hidden');
        
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
            
            tableBody.appendChild(row);
        });
    }

    function hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }
});