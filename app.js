// State
let data = null;
let userRatings = {};
let userStatuses = {};
let databaseEnabled = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    databaseEnabled = initSupabase();
    if (databaseEnabled) {
        await loadRatingsFromDatabase();
    } else {
        loadUserData();
    }
    setupTabs();
    populateStreamingFilters();
    initializeFilterState();
    renderTopPicks();
    renderTodaysBatch();
    renderLibrary();
    setupEventListeners();
    setupFilterListeners();
});

// Load shows data
async function loadData() {
    try {
        const response = await fetch('data/shows.json');
        data = await response.json();
        console.log('Loaded data:', data);
    } catch (error) {
        console.error('Error loading data:', error);
        document.body.innerHTML = '<div class="loading">Error loading data. Please refresh the page.</div>';
    }
}

// Load user data from localStorage
function loadUserData() {
    const saved = localStorage.getItem('hemantTVRatings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            userRatings = parsed.ratings || {};
            userStatuses = parsed.statuses || {};
        } catch (e) {
            console.error('Error parsing saved data:', e);
        }
    }
}

// Save user data to localStorage
function saveUserData() {
    localStorage.setItem('hemantTVRatings', JSON.stringify({
        ratings: userRatings,
        statuses: userStatuses,
        lastUpdated: new Date().toISOString()
    }));
}

// Get show by title
function getShow(title) {
    return data.shows.find(s => s.title === title);
}

// Setup tabs
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // Update buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update panes
            tabPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// Initialize filter state (collapsed on mobile by default)
function initializeFilterState() {
    if (window.innerWidth <= 768) {
        ['topPicksFilters', 'batchFilters', 'libraryFilters'].forEach(id => {
            const filters = document.getElementById(id);
            if (filters) filters.classList.add('collapsed');
        });
    }
}

// Toggle filters
function toggleFilters(tab) {
    const filterMap = {
        'topPicks': 'topPicksFilters',
        'batch': 'batchFilters',
        'library': 'libraryFilters'
    };
    
    const filtersId = filterMap[tab];
    const filters = document.getElementById(filtersId);
    
    if (filters) {
        if (filters.classList.contains('collapsed')) {
            filters.classList.remove('collapsed');
            filters.classList.add('expanded');
        } else {
            filters.classList.add('collapsed');
            filters.classList.remove('expanded');
        }
    }
}

// Count active filters
function updateFilterCount(tab) {
    const filterConfigs = {
        'topPicks': {
            countId: 'topPicksFilterCount',
            filters: ['topPicksStreamingFilter', 'topPicksImdbFilter']
        },
        'batch': {
            countId: 'batchFilterCount',
            filters: ['batchStreamingFilter', 'batchImdbFilter']
        },
        'library': {
            countId: 'libraryFilterCount',
            filters: ['libraryStreamingFilter', 'libraryRatingFilter', 'statusFilter']
        }
    };
    
    const config = filterConfigs[tab];
    if (!config) return;
    
    let totalCount = 0;
    config.filters.forEach(filterId => {
        const selected = getSelectedValues(filterId);
        totalCount += selected.length;
    });
    
    // Add search if present
    if (tab === 'library') {
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim()) {
            totalCount += 1;
        }
    }
    
    const countEl = document.getElementById(config.countId);
    if (countEl) {
        countEl.textContent = totalCount > 0 ? totalCount : '';
    }
}

// Populate streaming filters from data
function populateStreamingFilters() {
    if (!data || !data.shows) return;
    
    // Get unique streaming services
    const services = new Set();
    data.shows.forEach(show => {
        if (show.streaming) {
            // Handle multiple services separated by commas
            show.streaming.split(',').forEach(service => {
                services.add(service.trim());
            });
        }
    });
    
    const sortedServices = Array.from(services).sort();
    
    // Populate all three filter dropdowns
    ['topPicksStreamingFilter', 'batchStreamingFilter', 'libraryStreamingFilter'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = sortedServices.map(service => 
                `<option value="${service}">${service}</option>`
            ).join('');
        }
    });
}

// Get selected values from multi-select
function getSelectedValues(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return [];
    return Array.from(select.selectedOptions).map(opt => opt.value);
}

// Check if show matches IMDb rating filter
function matchesImdbRating(show, ratingBands) {
    if (ratingBands.length === 0) return true;
    
    const rating = parseFloat(show.imdb_rating);
    if (isNaN(rating)) return false;
    
    return ratingBands.some(band => {
        if (band === '9+') return rating >= 9.0;
        if (band === '8-9') return rating >= 8.0 && rating < 9.0;
        if (band === '7-8') return rating >= 7.0 && rating < 8.0;
        if (band === 'below7') return rating < 7.0;
        return false;
    });
}

// Check if show matches streaming filter
function matchesStreaming(show, services) {
    if (services.length === 0) return true;
    if (!show.streaming) return false;
    
    const showServices = show.streaming.split(',').map(s => s.trim());
    return services.some(service => showServices.includes(service));
}

// Check if show matches user rating filter
function matchesUserRating(show, ratings) {
    if (ratings.length === 0) return true;
    
    const userRating = userRatings[show.title] || show.rating;
    return ratings.includes(userRating);
}

// Check if show matches status filter
function matchesStatus(show, statuses) {
    if (statuses.length === 0) return true;
    
    const userStatus = userStatuses[show.title] || show.status;
    return statuses.includes(userStatus);
}

// Clear filters for a specific tab
function clearFilters(tab) {
    if (tab === 'topPicks') {
        document.getElementById('topPicksStreamingFilter').selectedIndex = -1;
        document.getElementById('topPicksImdbFilter').selectedIndex = -1;
        renderTopPicks();
    } else if (tab === 'batch') {
        document.getElementById('batchStreamingFilter').selectedIndex = -1;
        document.getElementById('batchImdbFilter').selectedIndex = -1;
        renderTodaysBatch();
    } else if (tab === 'library') {
        document.getElementById('libraryStreamingFilter').selectedIndex = -1;
        document.getElementById('libraryRatingFilter').selectedIndex = -1;
        document.getElementById('statusFilter').selectedIndex = -1;
        document.getElementById('searchInput').value = '';
        renderLibrary();
    }
}

// Setup filter listeners
function setupFilterListeners() {
    // Top 5 filters
    ['topPicksStreamingFilter', 'topPicksImdbFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderTopPicks);
    });
    
    // Batch filters
    ['batchStreamingFilter', 'batchImdbFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderTodaysBatch);
    });
    
    // Library filters
    ['libraryStreamingFilter', 'libraryRatingFilter', 'statusFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderLibrary);
    });
}

// Create card HTML
function createShowCard(show, includeRatingButtons = false, includePitch = false, isTopPick = false, isRateToday = false) {
    // For Rate Today cards, ignore any existing rating (start fresh)
    const userRating = isRateToday ? '' : (userRatings[show.title] || show.rating);
    const userStatus = userStatuses[show.title] || show.status;
    
    const imdbUrl = show.imdb_id ? `https://www.imdb.com/title/${show.imdb_id}/` : null;
    
    // For Top 5: show rating buttons if marked as Watched
    const showRatingInTopPick = isTopPick && userStatus === 'Watched' && !userRating;
    
    return `
        <div class="show-card" data-title="${show.title}">
            <div class="card-image">
                <img src="${show.img}" 
                     alt="${show.title}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                <div class="fallback" style="display: none;">
                    📺<br>${show.title}
                </div>
                ${show.imdb_rating && show.imdb_rating !== 'N/A' && show.imdb_rating !== null ? 
                    `<div class="imdb-badge">
                        <span>⭐</span>
                        <span>${show.imdb_rating}</span>
                    </div>` : ''}
            </div>
            <div class="card-content">
                <div class="card-title">
                    ${imdbUrl ? 
                        `<a href="${imdbUrl}" target="_blank" rel="noopener noreferrer">${show.title}</a>` :
                        `<span>${show.title}</span>`}
                </div>
                <div class="card-meta">
                    ${show.year} • ${show.lang}
                </div>
                ${show.genres && show.genres.length > 0 ? 
                    `<div class="card-genres">${show.genres.slice(0, 3).join(', ')}</div>` : ''}
                ${includePitch && getPitch(show.title) ? 
                    `<div class="card-pitch">${getPitch(show.title)}</div>` : ''}
                ${show.streaming ? 
                    `<div class="card-streaming">📺 ${show.streaming}</div>` : ''}
                
                ${includeRatingButtons || showRatingInTopPick ? `
                    <div class="card-buttons rating-buttons">
                        <button class="btn btn-loved ${userRating === 'loved' ? 'active' : ''}" 
                                onclick="setRating('${show.title}', 'loved', ${isTopPick})">❤️ Loved</button>
                        <button class="btn btn-okay ${userRating === 'okay' ? 'active' : ''}" 
                                onclick="setRating('${show.title}', 'okay', ${isTopPick})">👍 Okay</button>
                        <button class="btn btn-disliked ${userRating === 'disliked' ? 'active' : ''}" 
                                onclick="setRating('${show.title}', 'disliked', ${isTopPick})">👎 Disliked</button>
                        ${!isTopPick && !isRateToday ? `<button class="btn ${!userRating ? 'active' : ''}" 
                                onclick="setRating('${show.title}', '', false)">👀 Haven't Seen</button>` : ''}
                    </div>
                ` : ''}
                
                ${!showRatingInTopPick && !isRateToday ? `
                    <div class="card-buttons status-buttons">
                        <button class="btn ${userStatus === 'Want to watch' ? 'active' : ''}" 
                                onclick="setStatus('${show.title}', 'Want to watch', ${isTopPick})">📌 Want to Watch</button>
                        <button class="btn ${userStatus === 'Watching' ? 'active' : ''}" 
                                onclick="setStatus('${show.title}', 'Watching', ${isTopPick})">▶️ Watching</button>
                        <button class="btn ${userStatus === 'Watched' ? 'active' : ''}" 
                                onclick="setStatus('${show.title}', 'Watched', ${isTopPick})">✅ Watched</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Get pitch for top picks
function getPitch(title) {
    const pitches = {
        'Scam 1992': 'Rise and fall of India\'s biggest stockbroker in a riveting financial thriller',
        'Chernobyl': 'The harrowing true story of the 1986 nuclear disaster',
        'Game of Thrones': 'Epic fantasy saga of power, betrayal, and dragons',
        'Sherlock': 'Modern-day Sherlock Holmes solves impossible cases in London',
        'Better Call Saul': 'Breaking Bad prequel following a con-man lawyer\'s transformation',
        'The Sopranos': 'Mobster Tony Soprano balances family life and organized crime',
        'Succession': 'A powerful media family fights for control of their empire',
        'Rome': 'Sex, intrigue, and power in ancient Rome',
        'Severance': 'Workers\' memories are surgically divided between work and personal life',
        'Dark': 'Time-bending German thriller across four generations',
        'Black Mirror': 'Anthology exploring dark twists of technology and humanity',
        'Line of Duty': 'Anti-corruption unit investigates bent coppers in riveting police thriller',
        'True Detective S1': 'Two detectives hunt a serial killer across 17 years in Louisiana',
        'Slow Horses': 'Disgraced MI5 agents tackle espionage from a dumping-ground department',
        'Panchayat': 'Engineering graduate becomes secretary of a remote village panchayat',
        'Breaking Bad': 'Chemistry teacher turns meth kingpin after cancer diagnosis',
        'The West Wing': 'Idealistic staffers run the White House',
        'Rocket Boys': 'True story of India\'s space and atomic programs',
        'Fleabag': 'Witty, broken woman navigates love and loss in London',
        'Peaky Blinders': 'Post-WWI Birmingham gangster family builds an empire',
        'The Crown': 'Inside the reign of Queen Elizabeth II',
        'Mindhunter': 'FBI agents interview serial killers to solve ongoing cases',
        'Ted Lasso': 'American football coach brings optimism to English soccer',
        'Stranger Things': '80s kids battle supernatural forces in small-town Indiana',
        'Endeavour': 'Young Inspector Morse solves complex murders in 1960s Oxford',
        'Mare of Easttown': 'Small-town detective investigates murder while dealing with personal tragedy',
        'Kohrra': 'Two cops investigate a murder in rural Punjab, uncovering village secrets',
        'The Diplomat': 'US ambassador in London navigates international crises and marriage troubles',
        'Broadchurch': 'Coastal town rocked by child murder investigation that exposes dark secrets',
        'Happy Valley': 'Tough Yorkshire sergeant confronts a kidnapper in this gripping British crime drama',
        'The Capture': 'Surveillance thriller questioning what\'s real when video evidence can be manipulated',
        'The Americans': 'Soviet spies posing as Americans during the Cold War, balancing espionage and family',
        'Le Bureau': 'Elite French intelligence officers navigate dangerous undercover missions abroad',
        'Wallander': 'Kenneth Branagh as troubled Swedish detective solving dark crimes in Ystad'
    };
    return pitches[title] || '';
}

// Render Today's Batch
function renderTodaysBatch() {
    const container = document.getElementById('batchGrid');
    if (!data || !data.todaysBatch) return;
    
    // Get filter values
    const streamingFilter = getSelectedValues('batchStreamingFilter');
    const imdbFilter = getSelectedValues('batchImdbFilter');
    
    const html = data.todaysBatch
        .map(title => {
            const show = getShow(title);
            if (!show) return '';
            
            // Skip if already rated (moved to Watched)
            const userRating = userRatings[show.title];
            if (userRating) return '';
            
            // Apply filters
            if (!matchesStreaming(show, streamingFilter)) return '';
            if (!matchesImdbRating(show, imdbFilter)) return '';
            
            return createShowCard(show, true, false, false, true); // isRateToday = true
        })
        .filter(h => h)
        .join('');
    
    container.innerHTML = html || '<div class="empty-state"><h3>All shows rated!</h3><p>Check the Watched tab to see your ratings.</p></div>';
    updateFilterCount('batch');
}

// Render Top Picks
function renderTopPicks() {
    const container = document.getElementById('picksGrid');
    if (!data || !data.top5) return;
    
    // Get filter values
    const streamingFilter = getSelectedValues('topPicksStreamingFilter');
    const imdbFilter = getSelectedValues('topPicksImdbFilter');
    
    const html = data.top5
        .map(pick => {
            const show = getShow(pick.title);
            if (!show) return '';
            
            // Don't show if already rated (moved to Watched)
            const userRating = userRatings[show.title] || show.rating;
            if (userRating) return '';
            
            // Apply filters
            if (!matchesStreaming(show, streamingFilter)) return '';
            if (!matchesImdbRating(show, imdbFilter)) return '';
            
            return createShowCard(show, false, true, true);
        })
        .filter(h => h)
        .join('');
    
    container.innerHTML = html || '<div class="empty-state"><h3>No shows match your filters</h3><p>Try adjusting your filters or clear them to see all recommendations.</p></div>';
    updateFilterCount('topPicks');
}

// Render Library with filters
function renderLibrary() {
    const container = document.getElementById('libraryGrid');
    const countEl = document.getElementById('libraryCount');
    if (!data || !data.shows) return;
    
    // Get filter values
    const streamingFilter = getSelectedValues('libraryStreamingFilter');
    const ratingFilter = getSelectedValues('libraryRatingFilter');
    const statusFilterValues = getSelectedValues('statusFilter');
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    // Separate user ratings from IMDb rating bands
    const userRatingFilter = ratingFilter.filter(r => ['loved', 'okay', 'disliked'].includes(r));
    const imdbRatingFilter = ratingFilter.filter(r => !['loved', 'okay', 'disliked'].includes(r));
    
    let filtered = data.shows.filter(show => {
        // Streaming filter
        if (!matchesStreaming(show, streamingFilter)) return false;
        
        // User rating filter
        if (userRatingFilter.length > 0 && !matchesUserRating(show, userRatingFilter)) return false;
        
        // IMDb rating filter
        if (imdbRatingFilter.length > 0 && !matchesImdbRating(show, imdbRatingFilter)) return false;
        
        // Status filter
        if (!matchesStatus(show, statusFilterValues)) return false;
        
        // Search filter
        if (searchQuery) {
            const searchableText = `${show.title} ${show.genres.join(' ')} ${show.year}`.toLowerCase();
            if (!searchableText.includes(searchQuery)) return false;
        }
        
        return true;
    });
    
    // Sort by IMDb rating (highest first)
    filtered.sort((a, b) => {
        const ratingA = parseFloat(a.imdb_rating) || 0;
        const ratingB = parseFloat(b.imdb_rating) || 0;
        return ratingB - ratingA;
    });
    
    countEl.textContent = `Showing ${filtered.length} of ${data.shows.length} shows`;
    
    const html = filtered
        .map(show => createShowCard(show, false, false))
        .join('');
    
    container.innerHTML = html || '<div class="empty-state"><h3>No shows match your filters</h3><p>Try adjusting your filters or search terms.</p></div>';
    updateFilterCount('library');
}

// Set rating
async function setRating(title, rating, isTopPick = false) {
    const show = getShow(title);
    
    if (rating === '') {
        delete userRatings[title];
    } else {
        userRatings[title] = rating;
        
        // Save to database
        if (databaseEnabled && show) {
            await saveRatingToDatabase(title, rating, show.imdb_id);
        }
    }
    
    saveUserData(); // Also save to localStorage as backup
    
    // If from Top 5 or Rate Today and rated, it moves to Watched tab
    if ((isTopPick || isRateToday(title)) && rating) {
        // Auto-set status to Watched when rated
        userStatuses[title] = 'Watched';
        saveUserData();
        
        renderTopPicks();
        renderTodaysBatch();
        renderLibrary();
        
        // Switch to Watched tab to show the rated show
        const watchedTab = document.querySelector('[data-tab="library"]');
        if (watchedTab) watchedTab.click();
    } else {
        renderTodaysBatch();
        renderTopPicks();
        renderLibrary();
    }
}

// Check if show is in Rate Today batch
function isRateToday(title) {
    return data && data.todaysBatch && data.todaysBatch.includes(title);
}

// Set status
function setStatus(title, status, isTopPick = false) {
    if (userStatuses[title] === status) {
        delete userStatuses[title];
    } else {
        userStatuses[title] = status;
    }
    saveUserData();
    
    // Re-render to show rating buttons if Top 5 show marked as Watched
    if (isTopPick) {
        renderTopPicks();
    } else {
        renderTodaysBatch();
        renderTopPicks();
        renderLibrary();
    }
}

// Export ratings
function exportRatings() {
    const exportData = {
        ratings: userRatings,
        statuses: userStatuses,
        exportedAt: new Date().toISOString(),
        showCount: Object.keys(userRatings).length + Object.keys(userStatuses).length
    };
    
    const json = JSON.stringify(exportData, null, 2);
    
    // Copy to clipboard
    navigator.clipboard.writeText(json).then(() => {
        alert('✅ Your ratings have been copied to clipboard!\n\nYou can now paste them in your message to update your data.');
    }).catch(err => {
        // Fallback: show in alert
        const textarea = document.createElement('textarea');
        textarea.value = json;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('✅ Your ratings have been copied to clipboard!\n\nYou can now paste them in your message to update your data.');
    });
}

// Setup event listeners
function setupEventListeners() {
    const exportLink = document.getElementById('exportLink');
    if (exportLink) {
        exportLink.addEventListener('click', (e) => {
            e.preventDefault();
            exportRatings();
        });
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(renderLibrary, 300));
    }
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions global for onclick handlers
window.setRating = setRating;
window.setStatus = setStatus;
window.clearFilters = clearFilters;
window.toggleFilters = toggleFilters;
