// State
let data = null;
let userRatings = {};
let userStatuses = {};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    loadUserData();
    renderTodaysBatch();
    renderTopPicks();
    renderLibrary();
    setupEventListeners();
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

// Create card HTML
function createShowCard(show, includeRatingButtons = false, includePitch = false) {
    const userRating = userRatings[show.title] || show.rating;
    const userStatus = userStatuses[show.title] || show.status;
    
    const imdbUrl = show.imdb_id ? `https://www.imdb.com/title/${show.imdb_id}/` : null;
    
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
                
                ${includeRatingButtons ? `
                    <div class="card-buttons rating-buttons">
                        <button class="btn btn-loved ${userRating === 'loved' ? 'active' : ''}" 
                                onclick="setRating('${show.title}', 'loved')">❤️ Loved</button>
                        <button class="btn btn-okay ${userRating === 'okay' ? 'active' : ''}" 
                                onclick="setRating('${show.title}', 'okay')">👍 Okay</button>
                        <button class="btn btn-disliked ${userRating === 'disliked' ? 'active' : ''}" 
                                onclick="setRating('${show.title}', 'disliked')">👎 Disliked</button>
                        <button class="btn ${!userRating ? 'active' : ''}" 
                                onclick="setRating('${show.title}', '')">👀 Haven't Seen</button>
                    </div>
                ` : ''}
                
                <div class="card-buttons status-buttons">
                    <button class="btn ${userStatus === 'Want to watch' ? 'active' : ''}" 
                            onclick="setStatus('${show.title}', 'Want to watch')">📌 Want to Watch</button>
                    <button class="btn ${userStatus === 'Watching' ? 'active' : ''}" 
                            onclick="setStatus('${show.title}', 'Watching')">▶️ Watching</button>
                    <button class="btn ${userStatus === 'Watched' ? 'active' : ''}" 
                            onclick="setStatus('${show.title}', 'Watched')">✅ Watched</button>
                </div>
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
    
    const html = data.todaysBatch
        .map(title => {
            const show = getShow(title);
            return show ? createShowCard(show, true, false) : '';
        })
        .filter(h => h)
        .join('');
    
    container.innerHTML = html || '<div class="empty-state"><h3>No shows in today\'s batch</h3></div>';
}

// Render Top Picks
function renderTopPicks() {
    const container = document.getElementById('picksGrid');
    if (!data || !data.top5) return;
    
    const html = data.top5
        .map(pick => {
            const show = getShow(pick.title);
            return show ? createShowCard(show, false, true) : '';
        })
        .filter(h => h)
        .join('');
    
    container.innerHTML = html || '<div class="empty-state"><h3>No top picks available</h3></div>';
}

// Render Library with filters
function renderLibrary() {
    const container = document.getElementById('libraryGrid');
    const countEl = document.getElementById('libraryCount');
    if (!data || !data.shows) return;
    
    const ratingFilter = document.getElementById('ratingFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    let filtered = data.shows.filter(show => {
        // Rating filter
        const showRating = userRatings[show.title] || show.rating;
        if (ratingFilter !== 'all' && showRating !== ratingFilter) return false;
        
        // Status filter
        const showStatus = userStatuses[show.title] || show.status;
        if (statusFilter !== 'all' && showStatus !== statusFilter) return false;
        
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
}

// Set rating
function setRating(title, rating) {
    if (rating === '') {
        delete userRatings[title];
    } else {
        userRatings[title] = rating;
    }
    saveUserData();
    renderTodaysBatch();
    renderLibrary();
}

// Set status
function setStatus(title, status) {
    if (userStatuses[title] === status) {
        delete userStatuses[title];
    } else {
        userStatuses[title] = status;
    }
    saveUserData();
    renderTodaysBatch();
    renderTopPicks();
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
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportRatings);
    }
    
    const ratingFilter = document.getElementById('ratingFilter');
    if (ratingFilter) {
        ratingFilter.addEventListener('change', renderLibrary);
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', renderLibrary);
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
