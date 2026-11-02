// State
let data = null;
let userRatings = {};
let userStatuses = {};
let databaseEnabled = false;
let seenYes = new Set(); // Track shows where user clicked "Yes" to "Seen it?"

// Streaming service logo mapping (local logos for subscribed services)
const streamingLogos = {
    'Netflix': 'assets/logos/netflix.svg',
    'Prime Video': 'assets/logos/prime.svg',
    'Max': 'assets/logos/max.svg'
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadData();
        
        // Try to initialize database
        try {
            databaseEnabled = initSupabase();
            if (databaseEnabled) {
                await loadRatingsFromDatabase();
            } else {
                console.warn('Database not initialized, using localStorage only');
                loadUserData();
            }
        } catch (dbError) {
            console.error('Database initialization failed:', dbError);
            databaseEnabled = false;
            loadUserData();
        }
        
        // Always set up UI regardless of database status
        setupTabs();
        populateStreamingFilters();
        setupDropdowns();
        
        // Load AI suggestions if database is enabled
        if (databaseEnabled) {
            await loadSuggestionsFromDatabase();
        }
        
        renderNewRatings();
        renderLibrary();
        renderNotSeen();
        setupEventListeners();
    } catch (error) {
        console.error('Critical initialization error:', error);
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; color: white;">
                <h2>Error Loading Site</h2>
                <p>Please refresh the page. If the problem persists, clear your browser cache.</p>
                <p style="color: #999; font-size: 0.9rem;">Error: ${error.message}</p>
            </div>
        `;
    }
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

// Check if rating is a real rating (not metadata like not_seen/not_interested)
function isRealRating(rating) {
    return rating && ['loved', 'okay', 'disliked'].includes(rating);
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
            
            // Update filter panel content and badge
            if (document.getElementById('filterSidePanel')?.classList.contains('active')) {
                populateFilterPanel();
            }
            updateGlobalFilterBadge();
        });
    });
}

// Toggle filters panel
function toggleFilters(tab) {
    const filterMap = {
        'newRatings': 'newRatingsFilters',
        'library': 'libraryFilters',
        'notSeen': 'notSeenFilters'
    };
    
    const filtersId = filterMap[tab];
    const filters = document.getElementById(filtersId);
    
    if (filters) {
        filters.classList.toggle('collapsed');
    }
}

// Toggle dropdown menu
function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId + 'Dropdown');
    if (!dropdown) return;
    
    // Close all other dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (menu !== dropdown) menu.classList.remove('show');
    });
    
    dropdown.classList.toggle('show');
    event.stopPropagation();
}

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
    });
});

// Populate streaming filters
function populateStreamingFilters() {
    if (!data || !data.shows) return;
    
    const services = new Set();
    data.shows.forEach(show => {
        if (show.streaming) {
            show.streaming.split(',').forEach(service => {
                services.add(service.trim());
            });
        }
    });
    
    const sortedServices = Array.from(services).sort();
    
    ['newRatingsStreaming', 'libraryStreaming', 'notSeenStreaming'].forEach(id => {
        const container = document.getElementById(id + 'Options');
        if (container) {
            container.innerHTML = sortedServices.map(service => 
                `<label><input type="checkbox" value="${service}"> ${service}</label>`
            ).join('');
        }
    });
}

// Setup dropdown checkboxes
function setupDropdowns() {
    document.querySelectorAll('.dropdown-options').forEach(container => {
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const dropdownMenu = checkbox.closest('.dropdown-menu');
                const dropdownId = dropdownMenu.id.replace('Dropdown', '');
                updateDropdownLabel(dropdownId);
                
                // Trigger appropriate render
                if (dropdownId.includes('newRatings')) {
                    renderNewRatings();
                } else if (dropdownId.includes('library')) {
                    renderLibrary();
                } else if (dropdownId.includes('notSeen')) {
                    renderNotSeen();
                }
            });
        });
    });
}

// Update dropdown button label
function updateDropdownLabel(dropdownId) {
    const dropdown = document.getElementById(dropdownId + 'Dropdown');
    const btn = dropdown.previousElementSibling;
    const label = btn.querySelector('.dropdown-label');
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
        label.textContent = 'Select...';
    } else if (checkboxes.length === 1) {
        label.textContent = checkboxes[0].parentElement.textContent.trim();
    } else {
        label.textContent = `${checkboxes.length} selected`;
    }
    
    updateFilterChips();
}

// Get selected values from dropdown
function getDropdownValues(dropdownId) {
    const dropdown = document.getElementById(dropdownId + 'Dropdown');
    if (!dropdown) return [];
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// Clear dropdown
function clearDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId + 'Dropdown');
    if (!dropdown) return;
    
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    updateDropdownLabel(dropdownId);
    
    // Trigger appropriate render
    if (dropdownId.includes('newRatings')) {
        renderNewRatings();
    } else if (dropdownId.includes('library')) {
        renderLibrary();
    } else if (dropdownId.includes('notSeen')) {
        renderNotSeen();
    }
    
    event.stopPropagation();
}

// Clear all filters for a tab
function clearAllFilters(tab) {
    if (tab === 'newRatings') {
        clearDropdown('newRatingsStreaming');
        clearDropdown('newRatingsImdb');
    } else if (tab === 'library') {
        clearDropdown('libraryStreaming');
        clearDropdown('libraryRating');
        clearDropdown('libraryStatus');
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        renderLibrary();
    } else if (tab === 'notSeen') {
        clearDropdown('notSeenStreaming');
        clearDropdown('notSeenImdb');
    }
}

// Update filter chips
function updateFilterChips() {
    const tabs = [
        { tab: 'newRatings', dropdowns: ['newRatingsStreaming', 'newRatingsImdb'] },
        { tab: 'library', dropdowns: ['libraryStreaming', 'libraryRating', 'libraryStatus'] },
        { tab: 'notSeen', dropdowns: ['notSeenStreaming', 'notSeenImdb'] }
    ];
    
    tabs.forEach(({ tab, dropdowns }) => {
        const chipsContainer = document.getElementById(tab + 'FilterChips');
        const badgeEl = document.getElementById(tab + 'FilterCount');
        if (!chipsContainer) return;
        
        let chips = [];
        let totalCount = 0;
        
        dropdowns.forEach(dropdownId => {
            const dropdown = document.getElementById(dropdownId + 'Dropdown');
            if (!dropdown) return;
            
            const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:checked');
            checkboxes.forEach(cb => {
                const label = cb.parentElement.textContent.trim();
                chips.push({ dropdownId, value: cb.value, label });
                totalCount++;
            });
        });
        
        // Add search chip for library
        if (tab === 'library') {
            const searchInput = document.getElementById('searchInput');
            if (searchInput && searchInput.value.trim()) {
                chips.push({ dropdownId: 'search', value: searchInput.value, label: `Search: ${searchInput.value}` });
                totalCount++;
            }
        }
        
        chipsContainer.innerHTML = chips.map(chip => 
            `<span class="filter-chip">
                ${chip.label}
                <button class="chip-remove" onclick="removeFilterChip('${chip.dropdownId}', '${chip.value.replace(/'/g, "\\'")}')">×</button>
            </span>`
        ).join('');
        
        if (badgeEl) {
            badgeEl.textContent = totalCount > 0 ? totalCount : '';
        }
    });
    
    // Update global filter badge
    updateGlobalFilterBadge();
}

// Remove individual filter chip
function removeFilterChip(dropdownId, value) {
    if (dropdownId === 'search') {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        renderLibrary();
        return;
    }
    
    const dropdown = document.getElementById(dropdownId + 'Dropdown');
    if (!dropdown) return;
    
    const checkbox = dropdown.querySelector(`input[type="checkbox"][value="${value}"]`);
    if (checkbox) {
        checkbox.checked = false;
        updateDropdownLabel(dropdownId);
        
        // Trigger appropriate render
        if (dropdownId.includes('newRatings')) {
            renderNewRatings();
        } else if (dropdownId.includes('library')) {
            renderLibrary();
        } else if (dropdownId.includes('notSeen')) {
            renderNotSeen();
        }
    }
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

// Get streaming badge HTML
function getStreamingBadges(streaming) {
    if (!streaming) return '';
    
    const services = streaming.split(',').map(s => s.trim());
    return services.map(service => {
        const logo = streamingLogos[service];
        if (logo) {
            return `<span class="streaming-badge" title="${service}">
                <img src="${logo}" alt="${service}">
            </span>`;
        } else {
            return `<span class="streaming-badge text-badge" title="${service}">${service}</span>`;
        }
    }).join('');
}

// Get pitch for show
function getPitch(title) {
    const pitches = {
        'Scam 1992': 'Rise and fall of India\'s biggest stockbroker',
        'Chernobyl': 'The harrowing true story of the 1986 nuclear disaster',
        'Game of Thrones': 'Epic fantasy saga of power, betrayal, and dragons',
        'Sherlock': 'Modern-day Sherlock Holmes solves impossible cases',
        'Better Call Saul': 'Breaking Bad prequel following a con-man lawyer',
        'The Sopranos': 'Mobster balances family life and organized crime',
        'Succession': 'Media family fights for control of their empire',
        'Rome': 'Sex, intrigue, and power in ancient Rome',
        'Severance': 'Memories surgically divided between work and life',
        'Dark': 'Time-bending German thriller across four generations',
        'Black Mirror': 'Dark twists of technology and humanity',
        'Line of Duty': 'Anti-corruption unit investigates bent coppers',
        'True Detective S1': 'Two detectives hunt serial killer across 17 years',
        'Slow Horses': 'Disgraced MI5 agents tackle espionage',
        'Panchayat': 'Engineer becomes secretary of remote village',
        'Breaking Bad': 'Chemistry teacher turns meth kingpin',
        'The West Wing': 'Idealistic staffers run the White House',
        'Rocket Boys': 'True story of India\'s space program',
        'Fleabag': 'Witty, broken woman navigates love and loss',
        'Peaky Blinders': 'Post-WWI Birmingham gangster family',
        'The Crown': 'Inside the reign of Queen Elizabeth II',
        'Mindhunter': 'FBI agents interview serial killers',
        'Ted Lasso': 'American coach brings optimism to English soccer',
        'Stranger Things': '80s kids battle supernatural forces',
        'Endeavour': 'Young Inspector Morse solves complex murders',
        'Mare of Easttown': 'Detective investigates murder in small town',
        'Kohrra': 'Cops investigate murder in rural Punjab',
        'The Diplomat': 'US ambassador navigates international crises',
        'Broadchurch': 'Child murder investigation exposes dark secrets',
        'Happy Valley': 'Yorkshire sergeant confronts kidnapper',
        'The Capture': 'When video evidence can be manipulated',
        'The Americans': 'Soviet spies posing as Americans',
        'Le Bureau': 'French intelligence officers on missions abroad',
        'Wallander': 'Troubled Swedish detective solving dark crimes',
        'Dept. Q': 'Matthew Goode runs an Edinburgh cold-case unit; Happy Valley/Line of Duty lane',
        'Black Doves': 'Keira Knightley spy in London with Ben Whishaw as her hitman minder',
        'The Chestnut Man': 'Nordic serial-killer hunt like The Killing/The Bridge',
        'Suzhal - The Vortex': 'Missing-girl mystery in small-town Tamil Nadu, close to Kohrra'
    };
    return pitches[title] || '';
}

// Create card HTML (horizontal layout)
function createShowCard(show, cardType = 'default') {
    const userRating = userRatings[show.title] || show.rating || '';
    const userStatus = userStatuses[show.title] || show.status || '';
    const imdbUrl = show.imdb_id ? `https://www.imdb.com/title/${show.imdb_id}/` : null;
    const pitch = getPitch(show.title);
    
    // For Rate Today: show "Seen it?" first, unless user clicked Yes or already rated
    const isRateToday = cardType === 'rateToday';
    const isTopPick = cardType === 'showRating';
    const hasSeenYes = seenYes.has(show.title);
    const hasRealRating = isRealRating(userRating);
    const showSeenQuestion = isRateToday && !userRating && !hasSeenYes;
    const showRatingControl = (isRateToday && (hasRealRating || hasSeenYes)) || (isTopPick && !userRating) || hasRealRating;
    
    return `
        <div class="show-card horizontal" data-title="${show.title.replace(/"/g, '&quot;')}">
            <div class="card-poster">
                <img src="${show.img}" 
                     alt="${show.title}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                <div class="poster-fallback" style="display: none;">📺</div>
            </div>
            <div class="card-details">
                <div class="card-header">
                    <div class="card-title">
                        ${imdbUrl ? 
                            `<a href="${imdbUrl}" target="_blank" rel="noopener noreferrer">${show.title}</a>` :
                            `<span>${show.title}</span>`}
                    </div>
                    ${show.imdb_rating && show.imdb_rating !== 'N/A' && show.imdb_rating !== null ? 
                        `<div class="imdb-badge-inline">⭐ ${show.imdb_rating}</div>` : ''}
                </div>
                <div class="card-meta">${show.year} • ${show.lang}${show.genres && show.genres.length > 0 ? ' • ' + show.genres.slice(0, 2).join(', ') : ''}</div>
                ${show.streaming ? `<div class="card-streaming">${getStreamingBadges(show.streaming)}</div>` : ''}
                ${pitch ? `<div class="card-pitch">${pitch}</div>` : ''}
                
                ${showSeenQuestion ? `
                    <div class="seen-question">
                        <span class="seen-label">Seen it?</span>
                        <div class="seen-buttons">
                            <button class="seen-btn yes" data-action="seenYes">Yes</button>
                            <button class="seen-btn no" data-action="seenNo">No</button>
                        </div>
                    </div>
                ` : ''}
                
                ${showRatingControl ? `
                    ${hasSeenYes && !hasRealRating ? '<a href="#" class="back-link" data-action="seenBack">← Back</a>' : ''}
                    <div class="rating-control">
                        <button class="rating-btn ${userRating === 'loved' ? 'active loved' : ''}" 
                                data-action="rate" data-rating="loved">❤️</button>
                        <button class="rating-btn ${userRating === 'okay' ? 'active okay' : ''}" 
                                data-action="rate" data-rating="okay">👍</button>
                        <button class="rating-btn ${userRating === 'disliked' ? 'active disliked' : ''}" 
                                data-action="rate" data-rating="disliked">👎</button>
                    </div>
                ` : ''}
                
                ${isTopPick && !userRating ? `
                    <button class="skip-btn" data-action="skip">Skip · not interested</button>
                ` : ''}
                
                ${cardType === 'notSeen' ? `
                    <div class="not-seen-actions">
                        <button class="undo-btn" data-action="undoNotSeen">Remove from list</button>
                        <div class="rating-control">
                            <button class="rating-btn" data-action="rate" data-rating="loved">❤️</button>
                            <button class="rating-btn" data-action="rate" data-rating="okay">👍</button>
                            <button class="rating-btn" data-action="rate" data-rating="disliked">👎</button>
                        </div>
                    </div>
                ` : ''}
                
                ${cardType === 'notInterested' ? `
                    <div class="not-interested-actions">
                        <button class="undo-btn" data-action="undoNotInterested">Undo · I'm interested</button>
                    </div>
                ` : ''}
                
                ${cardType === 'default' && !hasRealRating ? `
                    <div class="status-control">
                        <button class="status-btn ${userStatus === 'Watching' ? 'active' : ''}" 
                                data-action="status" data-status="Watching">▶️ Watching</button>
                        <button class="status-btn ${userStatus === 'Watched' ? 'active' : ''}" 
                                data-action="status" data-status="Watched">✅ Watched</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Answer "Seen it?" question
async function answerSeen(title, hasSeen) {
    const show = getShow(title);
    
    if (hasSeen) {
        // Add to seenYes Set and re-render to show rating controls
        seenYes.add(title);
        renderNewRatings();
    } else {
        // Mark as not_seen and save
        userRatings[title] = 'not_seen';
        
        if (databaseEnabled && show) {
            await saveRatingToDatabase(title, 'not_seen', show.imdb_id);
        }
        
        saveUserData();
        renderNewRatings();
        renderNotSeen();
    }
}

// Go back from rating control to "Seen it?" question
function goBackToSeenQuestion(title) {
    seenYes.delete(title);
    renderNewRatings();
}

// Undo not seen
async function undoNotSeen(title) {
    delete userRatings[title];
    saveUserData();
    
    renderNotSeen();
    renderNewRatings();
}

// Skip show (mark as not interested)
async function skipShow(title) {
    const show = getShow(title);
    
    userRatings[title] = 'not_interested';
    
    if (databaseEnabled && show) {
        await saveRatingToDatabase(title, 'not_interested', show.imdb_id);
    }
    
    saveUserData();
    renderNewRatings();
    renderNotSeen();
}

// Undo not interested
async function undoNotInterested(title) {
    delete userRatings[title];
    saveUserData();
    
    renderNotSeen();
    renderNewRatings();
}

// Render New Ratings (merged Top 5 + Rate Today + AI Suggestions)
function renderNewRatings() {
    const container = document.getElementById('newRatingsGrid');
    if (!data || !data.top5 || !data.todaysBatch) return;
    
    const streamingFilter = getDropdownValues('newRatingsStreaming');
    const imdbFilter = getDropdownValues('newRatingsImdb');
    
    let html = '';
    
    // Section 1: Top picks for you (AI suggestions first, then shows.json top5)
    let topPicksCards = [];
    
    // Add AI suggestion top picks (kind='top')
    if (data.suggestions && data.suggestions.top) {
        data.suggestions.top.forEach(suggestion => {
            // Skip if already rated
            if (userRatings[suggestion.title]) return;
            
            // Convert suggestion to show format for filtering
            const suggestionShow = {
                title: suggestion.title,
                year: suggestion.year,
                streaming: suggestion.streaming,
                imdb_rating: suggestion.meta?.imdb_rating || '0',
                _isAiSuggestion: true
            };
            
            if (!matchesStreaming(suggestionShow, streamingFilter)) return;
            if (!matchesImdbRating(suggestionShow, imdbFilter)) return;
            
            topPicksCards.push(createAISuggestionCard(suggestion, 'showRating'));
        });
    }
    
    // Add shows.json top5
    data.top5.forEach(pick => {
        const show = getShow(pick.title);
        if (!show) return;
        
        const userRating = userRatings[show.title] || show.rating;
        // Exclude any rated shows (including not_seen and not_interested)
        if (userRating) return;
        
        if (!matchesStreaming(show, streamingFilter)) return;
        if (!matchesImdbRating(show, imdbFilter)) return;
        
        topPicksCards.push(createShowCard(show, 'showRating'));
    });
    
    if (topPicksCards.length > 0) {
        html += '<div class="subsection">';
        html += '<h3 class="subsection-title">Top picks for you</h3>';
        html += '<div class="subsection-grid">';
        html += topPicksCards.join('');
        html += '</div>';
        html += '</div>';
    }
    
    // Section 2: Have you seen these? (AI suggestions batch + todaysBatch)
    let batchCards = [];
    
    // Add AI suggestion batch items (kind='batch')
    if (data.suggestions && data.suggestions.batch) {
        data.suggestions.batch.forEach(suggestion => {
            // Skip if already rated
            if (userRatings[suggestion.title]) return;
            
            // Convert suggestion to show format for filtering
            const suggestionShow = {
                title: suggestion.title,
                year: suggestion.year,
                streaming: suggestion.streaming,
                imdb_rating: suggestion.meta?.imdb_rating || '0',
                _isAiSuggestion: true
            };
            
            if (!matchesStreaming(suggestionShow, streamingFilter)) return;
            if (!matchesImdbRating(suggestionShow, imdbFilter)) return;
            
            batchCards.push(createAISuggestionCard(suggestion, 'rateToday'));
        });
    }
    
    // Add shows.json todaysBatch
    data.todaysBatch.forEach(title => {
        const show = getShow(title);
        if (!show) return;
        
        const userRating = userRatings[show.title];
        // Exclude rated shows (including not_seen)
        if (userRating && userRating !== '') return;
        
        if (!matchesStreaming(show, streamingFilter)) return;
        if (!matchesImdbRating(show, imdbFilter)) return;
        
        batchCards.push(createShowCard(show, 'rateToday'));
    });
    
    if (batchCards.length > 0) {
        html += '<div class="subsection">';
        html += '<h3 class="subsection-title">Have you seen these?</h3>';
        html += '<div class="subsection-grid">';
        html += batchCards.join('');
        html += '</div>';
        html += '</div>';
    }
    
    if (html === '') {
        html = '<div class="empty-state"><h3>All shows rated!</h3><p>Check the Watched tab to see your ratings or click "Get new picks" for AI recommendations.</p></div>';
    }
    
    container.innerHTML = html;
    updateFilterChips();
}

// Create show card from AI suggestion
function createAISuggestionCard(suggestion, cardType) {
    // Convert AI suggestion format to show format
    const show = {
        title: suggestion.title,
        year: suggestion.year,
        country: suggestion.country,
        genres: suggestion.genres || [],
        streaming: suggestion.streaming,
        imdb_rating: '0', // AI suggestions don't have IMDb ratings yet
        imdb_id: '',
        poster: suggestion.poster_url || '',
        pitch: suggestion.pitch || '',
        _isAiSuggestion: true
    };
    
    return createShowCard(show, cardType);
}

// Render Library (Watched - excluding not_seen and not_interested)
function renderLibrary() {
    const container = document.getElementById('libraryGrid');
    const countEl = document.getElementById('libraryCount');
    if (!data || !data.shows) return;
    
    const streamingFilter = getDropdownValues('libraryStreaming');
    const ratingFilter = getDropdownValues('libraryRating');
    const statusFilter = getDropdownValues('libraryStatus');
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    const userRatingFilter = ratingFilter.filter(r => ['loved', 'okay', 'disliked'].includes(r));
    const imdbRatingFilter = ratingFilter.filter(r => !['loved', 'okay', 'disliked'].includes(r));
    
    let filtered = data.shows.filter(show => {
        const rating = userRatings[show.title] || show.rating;
        
        // Exclude not_seen and not_interested
        if (rating === 'not_seen' || rating === 'not_interested') return false;
        
        if (!matchesStreaming(show, streamingFilter)) return false;
        if (userRatingFilter.length > 0 && !matchesUserRating(show, userRatingFilter)) return false;
        if (imdbRatingFilter.length > 0 && !matchesImdbRating(show, imdbRatingFilter)) return false;
        if (!matchesStatus(show, statusFilter)) return false;
        
        if (searchQuery) {
            const searchableText = `${show.title} ${show.genres.join(' ')} ${show.year}`.toLowerCase();
            if (!searchableText.includes(searchQuery)) return false;
        }
        
        return true;
    });
    
    filtered.sort((a, b) => {
        const ratingA = parseFloat(a.imdb_rating) || 0;
        const ratingB = parseFloat(b.imdb_rating) || 0;
        return ratingB - ratingA;
    });
    
    countEl.textContent = `Showing ${filtered.length} of ${data.shows.length} shows`;
    
    const html = filtered
        .map(show => createShowCard(show, 'default'))
        .join('');
    
    container.innerHTML = html || '<div class="empty-state"><h3>No shows match your filters</h3><p>Try adjusting your filters or search terms.</p></div>';
    updateFilterChips();
}

// Render Not Seen (with separate sections for not_seen and not_interested)
function renderNotSeen() {
    const container = document.getElementById('notSeenGrid');
    const countEl = document.getElementById('notSeenCount');
    if (!data || !data.shows) return;
    
    const streamingFilter = getDropdownValues('notSeenStreaming');
    const imdbFilter = getDropdownValues('notSeenImdb');
    
    // Separate not_seen and not_interested
    let notSeenShows = data.shows.filter(show => {
        const rating = userRatings[show.title];
        if (rating !== 'not_seen') return false;
        
        if (!matchesStreaming(show, streamingFilter)) return false;
        if (!matchesImdbRating(show, imdbFilter)) return false;
        
        return true;
    });
    
    let notInterestedShows = data.shows.filter(show => {
        const rating = userRatings[show.title];
        if (rating !== 'not_interested') return false;
        
        if (!matchesStreaming(show, streamingFilter)) return false;
        if (!matchesImdbRating(show, imdbFilter)) return false;
        
        return true;
    });
    
    // Sort both by IMDb rating
    const sortByRating = (a, b) => {
        const ratingA = parseFloat(a.imdb_rating) || 0;
        const ratingB = parseFloat(b.imdb_rating) || 0;
        return ratingB - ratingA;
    };
    
    notSeenShows.sort(sortByRating);
    notInterestedShows.sort(sortByRating);
    
    const totalCount = notSeenShows.length + notInterestedShows.length;
    
    if (countEl) {
        countEl.textContent = `${totalCount} show${totalCount !== 1 ? 's' : ''} marked`;
    }
    
    let html = '';
    
    // Not Seen section
    if (notSeenShows.length > 0) {
        html += '<div class="subsection">';
        html += '<h3 class="subsection-title">Not seen</h3>';
        html += '<div class="subsection-grid">';
        html += notSeenShows.map(show => createShowCard(show, 'notSeen')).join('');
        html += '</div>';
        html += '</div>';
    }
    
    // Not Interested section
    if (notInterestedShows.length > 0) {
        html += '<div class="subsection">';
        html += '<h3 class="subsection-title">Not interested</h3>';
        html += '<div class="subsection-grid">';
        html += notInterestedShows.map(show => createShowCard(show, 'notInterested')).join('');
        html += '</div>';
        html += '</div>';
    }
    
    if (html === '') {
        html = '<div class="empty-state"><h3>No shows marked</h3><p>When you mark shows as not seen or skip them in Top 5, they\'ll appear here.</p></div>';
    }
    
    container.innerHTML = html;
    updateFilterChips();
}

// Set rating
async function setRating(title, rating) {
    const show = getShow(title);
    
    // Toggle rating - if already set to this rating, remove it
    if (userRatings[title] === rating) {
        delete userRatings[title];
    } else {
        userRatings[title] = rating;
        
        if (databaseEnabled && show) {
            await saveRatingToDatabase(title, rating, show.imdb_id);
        }
        
        // Auto-set status to Watched when rated (for actual ratings, not not_seen)
        if (rating !== 'not_seen' && (!userStatuses[title] || userStatuses[title] !== 'Watched')) {
            userStatuses[title] = 'Watched';
        }
    }
    
    saveUserData();
    
    renderNewRatings();
    renderLibrary();
    renderNotSeen();
}

// Set status
function setStatus(title, status) {
    // Toggle status
    if (userStatuses[title] === status) {
        delete userStatuses[title];
    } else {
        userStatuses[title] = status;
    }
    saveUserData();
    
    renderNewRatings();
    renderLibrary();
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
    
    navigator.clipboard.writeText(json).then(() => {
        alert('✅ Your ratings have been copied to clipboard!\n\nYou can now paste them in your message to update your data.');
    }).catch(err => {
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
        searchInput.addEventListener('input', debounce(() => {
            renderLibrary();
        }, 300));
    }
    
    // Event delegation for all card actions
    document.addEventListener('click', async (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.dataset.action;
        const card = target.closest('.show-card');
        if (!card) return;
        
        const title = card.dataset.title;
        
        switch (action) {
            case 'seenYes':
                await answerSeen(title, true);
                break;
            case 'seenNo':
                await answerSeen(title, false);
                break;
            case 'seenBack':
                e.preventDefault();
                goBackToSeenQuestion(title);
                break;
            case 'rate':
                const rating = target.dataset.rating;
                await setRating(title, rating);
                break;
            case 'status':
                const status = target.dataset.status;
                setStatus(title, status);
                break;
            case 'undoNotSeen':
                await undoNotSeen(title);
                break;
            case 'skip':
                await skipShow(title);
                break;
            case 'undoNotInterested':
                await undoNotInterested(title);
                break;
        }
    });
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

// Get new AI recommendations
async function getNewRecommendations() {
    const btn = document.getElementById('getNewPicksBtn');
    if (!btn || btn.disabled) return;
    
    try {
        // Show loading state
        btn.disabled = true;
        btn.classList.add('loading');
        const originalText = btn.textContent;
        btn.textContent = 'Getting recommendations...';
        
        // Check if database is enabled
        if (!databaseEnabled || !window.sbClient) {
            throw new Error('Database not configured. Please set up Supabase credentials.');
        }
        
        // Call Supabase Edge Function
        const { data: functionData, error: functionError } = await window.sbClient.functions.invoke('recommend');
        
        if (functionError) {
            if (functionError.message?.includes('not found') || functionError.message?.includes('404')) {
                throw new Error('AI recommender not deployed yet. Run: supabase functions deploy recommend');
            }
            throw new Error(functionError.message || 'Failed to get recommendations');
        }
        
        if (functionData?.error) {
            throw new Error(functionData.error);
        }
        
        console.log('Recommendations generated:', functionData);
        
        // Load and render the new suggestions
        await loadSuggestionsFromDatabase();
        renderNewRatings();
        
        // Show success message briefly
        btn.textContent = `✓ Got ${functionData.topPicks || 0} top picks + ${functionData.batch || 0} more!`;
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('loading');
            btn.disabled = false;
        }, 2500);
        
    } catch (error) {
        console.error('Error getting recommendations:', error);
        btn.classList.remove('loading');
        
        // Show user-friendly error
        const errorMsg = error.message || 'Failed to get recommendations';
        btn.textContent = errorMsg.length > 50 ? '✗ Error - see console' : `✗ ${errorMsg}`;
        btn.disabled = false;
        
        // Alert for important errors
        if (errorMsg.includes('not deployed') || errorMsg.includes('not configured')) {
            alert(`AI Recommender Setup Required:\n\n${errorMsg}\n\nSee AI_RECOMMENDER_DEPLOYMENT.md for setup instructions.`);
        }
        
        setTimeout(() => {
            btn.textContent = '✨ Get new picks';
        }, 4000);
    }
}

// Load suggestions from database (fail silently if table doesn't exist)
async function loadSuggestionsFromDatabase() {
    if (!databaseEnabled || !window.sbClient) {
        // Initialize empty suggestions
        if (data && !data.suggestions) {
            data.suggestions = { top: [], batch: [] };
        }
        return;
    }
    
    try {
        const { data: suggestionsData, error } = await window.sbClient
            .from('suggestions')
            .select('*')
            .order('created_at', { ascending: false });
        
        // Fail silently if table doesn't exist (42P01 is Postgres "undefined table" error)
        if (error) {
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                console.log('Suggestions table not created yet. Run migration to enable AI recommendations.');
                if (data) data.suggestions = { top: [], batch: [] };
                return;
            }
            throw error;
        }
        
        // Store suggestions in global data object
        if (!data.suggestions) {
            data.suggestions = { top: [], batch: [] };
        }
        
        if (suggestionsData && suggestionsData.length > 0) {
            data.suggestions.top = suggestionsData.filter(s => s.kind === 'top').map(s => ({
                ...s.meta,
                _suggestionId: s.id,
                _isAiSuggestion: true
            }));
            
            data.suggestions.batch = suggestionsData.filter(s => s.kind === 'batch').map(s => ({
                ...s.meta,
                _suggestionId: s.id,
                _isAiSuggestion: true
            }));
            
            console.log('Loaded AI suggestions:', {
                top: data.suggestions.top.length,
                batch: data.suggestions.batch.length
            });
        } else {
            data.suggestions = { top: [], batch: [] };
        }
        
    } catch (error) {
        console.warn('Could not load suggestions (table may not exist yet):', error.message);
        if (data) data.suggestions = { top: [], batch: [] };
    }
}

// Toggle filter side panel
function toggleFilterPanel() {
    const overlay = document.getElementById('filterOverlay');
    const panel = document.getElementById('filterSidePanel');
    const btn = document.getElementById('filterIconBtn');
    
    const isActive = panel.classList.contains('active');
    
    if (isActive) {
        overlay.classList.remove('active');
        panel.classList.remove('active');
        btn.classList.remove('active');
    } else {
        overlay.classList.add('active');
        panel.classList.add('active');
        btn.classList.add('active');
        populateFilterPanel();
    }
}

// Populate filter panel based on active tab
function populateFilterPanel() {
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    const content = document.getElementById('filterPanelContent');
    
    if (!content) return;
    
    let html = '';
    
    if (activeTab === 'newRatings') {
        html = `
            <div class="filter-dropdown">
                <label>Streaming service</label>
                <div class="dropdown-wrapper">
                    <button class="dropdown-btn" onclick="toggleDropdown('newRatingsStreaming')">
                        <span class="dropdown-label">Select...</span>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div id="newRatingsStreamingDropdown" class="dropdown-menu">
                        <div class="dropdown-options" id="newRatingsStreamingOptions"></div>
                        <button class="dropdown-clear" onclick="clearDropdown('newRatingsStreaming')">Clear</button>
                    </div>
                </div>
            </div>
            <div class="filter-dropdown">
                <label>IMDb rating range</label>
                <div class="dropdown-wrapper">
                    <button class="dropdown-btn" onclick="toggleDropdown('newRatingsImdb')">
                        <span class="dropdown-label">Select...</span>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div id="newRatingsImdbDropdown" class="dropdown-menu">
                        <div class="dropdown-options">
                            <label><input type="checkbox" value="9+"> 9.0+</label>
                            <label><input type="checkbox" value="8-9"> 8.0-8.9</label>
                            <label><input type="checkbox" value="7-8"> 7.0-7.9</label>
                            <label><input type="checkbox" value="below7"> Below 7.0</label>
                        </div>
                        <button class="dropdown-clear" onclick="clearDropdown('newRatingsImdb')">Clear</button>
                    </div>
                </div>
            </div>
            <button class="btn-clear-all" onclick="clearAllFilters('newRatings')">Clear all filters</button>
        `;
    } else if (activeTab === 'library') {
        html = `
            <div class="filter-dropdown">
                <label>Streaming service</label>
                <div class="dropdown-wrapper">
                    <button class="dropdown-btn" onclick="toggleDropdown('libraryStreaming')">
                        <span class="dropdown-label">Select...</span>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div id="libraryStreamingDropdown" class="dropdown-menu">
                        <div class="dropdown-options" id="libraryStreamingOptions"></div>
                        <button class="dropdown-clear" onclick="clearDropdown('libraryStreaming')">Clear</button>
                    </div>
                </div>
            </div>
            <div class="filter-dropdown">
                <label>Ratings</label>
                <div class="dropdown-wrapper">
                    <button class="dropdown-btn" onclick="toggleDropdown('libraryRating')">
                        <span class="dropdown-label">Select...</span>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div id="libraryRatingDropdown" class="dropdown-menu">
                        <div class="dropdown-options">
                            <div class="dropdown-section">My Rating</div>
                            <label><input type="checkbox" value="loved"> ❤️ Loved</label>
                            <label><input type="checkbox" value="okay"> 👍 Okay</label>
                            <label><input type="checkbox" value="disliked"> 👎 Disliked</label>
                            <div class="dropdown-section">IMDb Rating</div>
                            <label><input type="checkbox" value="9+"> 9.0+</label>
                            <label><input type="checkbox" value="8-9"> 8.0-8.9</label>
                            <label><input type="checkbox" value="7-8"> 7.0-7.9</label>
                            <label><input type="checkbox" value="below7"> Below 7.0</label>
                        </div>
                        <button class="dropdown-clear" onclick="clearDropdown('libraryRating')">Clear</button>
                    </div>
                </div>
            </div>
            <div class="filter-dropdown">
                <label>Status</label>
                <div class="dropdown-wrapper">
                    <button class="dropdown-btn" onclick="toggleDropdown('libraryStatus')">
                        <span class="dropdown-label">Select...</span>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div id="libraryStatusDropdown" class="dropdown-menu">
                        <div class="dropdown-options">
                            <label><input type="checkbox" value="Watching"> ▶️ Watching</label>
                            <label><input type="checkbox" value="Watched"> ✅ Watched</label>
                        </div>
                        <button class="dropdown-clear" onclick="clearDropdown('libraryStatus')">Clear</button>
                    </div>
                </div>
            </div>
            <div class="filter-dropdown">
                <label>Search</label>
                <input type="text" id="searchInput" placeholder="Search shows..." onkeyup="debounce(() => renderLibrary(), 300)()">
            </div>
            <button class="btn-clear-all" onclick="clearAllFilters('library')">Clear all filters</button>
        `;
    } else if (activeTab === 'notSeen') {
        html = `
            <div class="filter-dropdown">
                <label>Streaming service</label>
                <div class="dropdown-wrapper">
                    <button class="dropdown-btn" onclick="toggleDropdown('notSeenStreaming')">
                        <span class="dropdown-label">Select...</span>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div id="notSeenStreamingDropdown" class="dropdown-menu">
                        <div class="dropdown-options" id="notSeenStreamingOptions"></div>
                        <button class="dropdown-clear" onclick="clearDropdown('notSeenStreaming')">Clear</button>
                    </div>
                </div>
            </div>
            <div class="filter-dropdown">
                <label>IMDb rating range</label>
                <div class="dropdown-wrapper">
                    <button class="dropdown-btn" onclick="toggleDropdown('notSeenImdb')">
                        <span class="dropdown-label">Select...</span>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div id="notSeenImdbDropdown" class="dropdown-menu">
                        <div class="dropdown-options">
                            <label><input type="checkbox" value="9+"> 9.0+</label>
                            <label><input type="checkbox" value="8-9"> 8.0-8.9</label>
                            <label><input type="checkbox" value="7-8"> 7.0-7.9</label>
                            <label><input type="checkbox" value="below7"> Below 7.0</label>
                        </div>
                        <button class="dropdown-clear" onclick="clearDropdown('notSeenImdb')">Clear</button>
                    </div>
                </div>
            </div>
            <button class="btn-clear-all" onclick="clearAllFilters('notSeen')">Clear all filters</button>
        `;
    }
    
    content.innerHTML = html;
    
    // Re-populate streaming options after DOM update
    populateStreamingFilters();
    
    // Re-setup dropdown listeners
    setupDropdowns();
}

// Update global filter badge count
function updateGlobalFilterBadge() {
    const badge = document.getElementById('globalFilterCount');
    if (!badge) return;
    
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    let count = 0;
    
    if (activeTab === 'newRatings') {
        count = getDropdownValues('newRatingsStreaming').length + getDropdownValues('newRatingsImdb').length;
    } else if (activeTab === 'library') {
        count = getDropdownValues('libraryStreaming').length + getDropdownValues('libraryRating').length + getDropdownValues('libraryStatus').length;
        if (document.getElementById('searchInput')?.value) count++;
    } else if (activeTab === 'notSeen') {
        count = getDropdownValues('notSeenStreaming').length + getDropdownValues('notSeenImdb').length;
    }
    
    badge.textContent = count > 0 ? count : '';
}

// Make functions global for onclick handlers
window.clearAllFilters = clearAllFilters;
window.toggleFilters = toggleFilters;
window.toggleDropdown = toggleDropdown;
window.clearDropdown = clearDropdown;
window.removeFilterChip = removeFilterChip;
window.getNewRecommendations = getNewRecommendations;
window.toggleFilterPanel = toggleFilterPanel;
