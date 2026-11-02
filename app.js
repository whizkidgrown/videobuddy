// State
let data = null;
let userRatings = {};
let userStatuses = {};
let databaseEnabled = false;

// Streaming service logo mapping (only for subscribed services)
const streamingLogos = {
    'Netflix': 'https://cdn.simpleicons.org/netflix/E50914',
    'Prime Video': 'https://cdn.simpleicons.org/amazonprimevideo/00A8E1',
    'Max': 'https://upload.wikimedia.org/wikipedia/commons/1/17/Max_logo.svg'
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
        renderTopPicks();
        renderTodaysBatch();
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

// Toggle filters panel
function toggleFilters(tab) {
    const filterMap = {
        'topPicks': 'topPicksFilters',
        'batch': 'batchFilters',
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
    
    ['topPicksStreaming', 'batchStreaming', 'libraryStreaming', 'notSeenStreaming'].forEach(id => {
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
                if (dropdownId.includes('topPicks')) {
                    renderTopPicks();
                } else if (dropdownId.includes('batch')) {
                    renderTodaysBatch();
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
    if (dropdownId.includes('topPicks')) {
        renderTopPicks();
    } else if (dropdownId.includes('batch')) {
        renderTodaysBatch();
    } else if (dropdownId.includes('library')) {
        renderLibrary();
    } else if (dropdownId.includes('notSeen')) {
        renderNotSeen();
    }
    
    event.stopPropagation();
}

// Clear all filters for a tab
function clearAllFilters(tab) {
    if (tab === 'topPicks') {
        clearDropdown('topPicksStreaming');
        clearDropdown('topPicksImdb');
    } else if (tab === 'batch') {
        clearDropdown('batchStreaming');
        clearDropdown('batchImdb');
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
        { tab: 'topPicks', dropdowns: ['topPicksStreaming', 'topPicksImdb'] },
        { tab: 'batch', dropdowns: ['batchStreaming', 'batchImdb'] },
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
        if (dropdownId.includes('topPicks')) {
            renderTopPicks();
        } else if (dropdownId.includes('batch')) {
            renderTodaysBatch();
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
        'Wallander': 'Troubled Swedish detective solving dark crimes'
    };
    return pitches[title] || '';
}

// Create card HTML (horizontal layout)
function createShowCard(show, cardType = 'default') {
    const userRating = userRatings[show.title] || show.rating || '';
    const userStatus = userStatuses[show.title] || show.status || '';
    const imdbUrl = show.imdb_id ? `https://www.imdb.com/title/${show.imdb_id}/` : null;
    const pitch = getPitch(show.title);
    
    // For Rate Today: show "Seen it?" first
    const isRateToday = cardType === 'rateToday';
    const showSeenQuestion = isRateToday && !userRating;
    
    return `
        <div class="show-card horizontal" data-title="${show.title}">
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
                            <button class="seen-btn yes" onclick="answerSeen('${show.title}', true)">Yes</button>
                            <button class="seen-btn no" onclick="answerSeen('${show.title}', false)">No</button>
                        </div>
                    </div>
                ` : ''}
                
                ${(isRateToday && userRating) || cardType === 'showRating' || userRating ? `
                    <div class="rating-control">
                        <button class="rating-btn ${userRating === 'loved' ? 'active loved' : ''}" 
                                onclick="setRating('${show.title}', 'loved')">❤️</button>
                        <button class="rating-btn ${userRating === 'okay' ? 'active okay' : ''}" 
                                onclick="setRating('${show.title}', 'okay')">👍</button>
                        <button class="rating-btn ${userRating === 'disliked' ? 'active disliked' : ''}" 
                                onclick="setRating('${show.title}', 'disliked')">👎</button>
                    </div>
                ` : ''}
                
                ${cardType === 'notSeen' ? `
                    <div class="not-seen-actions">
                        <button class="undo-btn" onclick="undoNotSeen('${show.title}')">Remove from list</button>
                        <div class="rating-control">
                            <button class="rating-btn" onclick="setRating('${show.title}', 'loved')">❤️</button>
                            <button class="rating-btn" onclick="setRating('${show.title}', 'okay')">👍</button>
                            <button class="rating-btn" onclick="setRating('${show.title}', 'disliked')">👎</button>
                        </div>
                    </div>
                ` : ''}
                
                ${cardType === 'default' && !userRating ? `
                    <div class="status-control">
                        <button class="status-btn ${userStatus === 'Watching' ? 'active' : ''}" 
                                onclick="setStatus('${show.title}', 'Watching')">▶️ Watching</button>
                        <button class="status-btn ${userStatus === 'Watched' ? 'active' : ''}" 
                                onclick="setStatus('${show.title}', 'Watched')">✅ Watched</button>
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
        // Just re-render to show rating controls
        renderTodaysBatch();
    } else {
        // Mark as not_seen and save
        userRatings[title] = 'not_seen';
        
        if (databaseEnabled && show) {
            await saveRatingToDatabase(title, 'not_seen', show.imdb_id);
        }
        
        saveUserData();
        renderTodaysBatch();
        renderNotSeen();
    }
}

// Undo not seen
async function undoNotSeen(title) {
    delete userRatings[title];
    saveUserData();
    
    renderNotSeen();
    renderTodaysBatch();
}

// Render Today's Batch
function renderTodaysBatch() {
    const container = document.getElementById('batchGrid');
    if (!data || !data.todaysBatch) return;
    
    const streamingFilter = getDropdownValues('batchStreaming');
    const imdbFilter = getDropdownValues('batchImdb');
    
    const html = data.todaysBatch
        .map(title => {
            const show = getShow(title);
            if (!show) return '';
            
            const userRating = userRatings[show.title];
            // Exclude rated shows (including not_seen)
            if (userRating && userRating !== '') return '';
            
            if (!matchesStreaming(show, streamingFilter)) return '';
            if (!matchesImdbRating(show, imdbFilter)) return '';
            
            return createShowCard(show, 'rateToday');
        })
        .filter(h => h)
        .join('');
    
    container.innerHTML = html || '<div class="empty-state"><h3>All shows rated!</h3><p>Check the Watched tab to see your ratings.</p></div>';
    updateFilterChips();
}

// Render Top Picks
function renderTopPicks() {
    const container = document.getElementById('picksGrid');
    if (!data || !data.top5) return;
    
    const streamingFilter = getDropdownValues('topPicksStreaming');
    const imdbFilter = getDropdownValues('topPicksImdb');
    
    const html = data.top5
        .map(pick => {
            const show = getShow(pick.title);
            if (!show) return '';
            
            const userRating = userRatings[show.title] || show.rating;
            // Exclude any rated shows (including not_seen)
            if (userRating) return '';
            
            if (!matchesStreaming(show, streamingFilter)) return '';
            if (!matchesImdbRating(show, imdbFilter)) return '';
            
            return createShowCard(show, 'showRating');
        })
        .filter(h => h)
        .join('');
    
    container.innerHTML = html || '<div class="empty-state"><h3>No shows match your filters</h3><p>Try adjusting your filters or clear them to see all recommendations.</p></div>';
    updateFilterChips();
}

// Render Library (Watched - excluding not_seen)
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
        
        // Exclude not_seen
        if (rating === 'not_seen') return false;
        
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

// Render Not Seen
function renderNotSeen() {
    const container = document.getElementById('notSeenGrid');
    const countEl = document.getElementById('notSeenCount');
    if (!data || !data.shows) return;
    
    const streamingFilter = getDropdownValues('notSeenStreaming');
    const imdbFilter = getDropdownValues('notSeenImdb');
    
    let filtered = data.shows.filter(show => {
        const rating = userRatings[show.title];
        if (rating !== 'not_seen') return false;
        
        if (!matchesStreaming(show, streamingFilter)) return false;
        if (!matchesImdbRating(show, imdbFilter)) return false;
        
        return true;
    });
    
    filtered.sort((a, b) => {
        const ratingA = parseFloat(a.imdb_rating) || 0;
        const ratingB = parseFloat(b.imdb_rating) || 0;
        return ratingB - ratingA;
    });
    
    if (countEl) {
        countEl.textContent = `${filtered.length} show${filtered.length !== 1 ? 's' : ''} marked as not seen`;
    }
    
    const html = filtered
        .map(show => createShowCard(show, 'notSeen'))
        .join('');
    
    container.innerHTML = html || '<div class="empty-state"><h3>No shows marked as not seen</h3><p>When you mark shows as not seen in Rate Today, they\'ll appear here.</p></div>';
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
    
    renderTopPicks();
    renderTodaysBatch();
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
    
    renderTopPicks();
    renderTodaysBatch();
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
window.clearAllFilters = clearAllFilters;
window.toggleFilters = toggleFilters;
window.toggleDropdown = toggleDropdown;
window.clearDropdown = clearDropdown;
window.removeFilterChip = removeFilterChip;
window.answerSeen = answerSeen;
window.undoNotSeen = undoNotSeen;
