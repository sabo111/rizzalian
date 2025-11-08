// =====================
// SUPABASE CONFIGURATION
// =====================
const SUPABASE_URL = 'https://ahhsnujwllarmhwunvsv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoaHNudWp3bGxhcm1od3VudnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTA3OTIsImV4cCI6MjA3NzM2Njc5Mn0.KbTR4zYe2vn0i-DLbN1kK738gmXtk2qOBAzU0L9ndsk';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================
// HELPER FUNCTIONS
// =====================

// Helper function to get date range
const getDateRange = (days = 30) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };
  
  return {
    start: formatDate(startDate),
    end: formatDate(endDate)
  };
};

// Helper function to convert date to date_key (YYYYMMDD format)
const dateToKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return parseInt(`${year}${month}${day}`);
};

// =====================
// DAILY ACTIVE USERS
// =====================

// Get daily active users data
const getDailyActiveUsers = async (days = 30) => {
  try {
    const { start, end } = getDateRange(days);
    const startKey = dateToKey(start);
    const endKey = dateToKey(end);

    const { data, error } = await supabase
      .from('fact_daily_active_users')
      .select(`
        *,
        dim_date (
          full_date,
          day_name,
          is_weekend
        )
      `)
      .gte('date_key', startKey)
      .lte('date_key', endKey)
      .order('date_key', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching daily active users:', error);
    return [];
  }
};

// =====================
// DAILY LIKES
// =====================

// Get daily likes data
const getDailyLikes = async (days = 30) => {
  try {
    const { start, end } = getDateRange(days);
    const startKey = dateToKey(start);
    const endKey = dateToKey(end);

    const { data, error } = await supabase
      .from('fact_daily_likes')
      .select(`
        *,
        dim_date (
          full_date,
          day_name
        )
      `)
      .gte('date_key', startKey)
      .lte('date_key', endKey)
      .order('date_key', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching daily likes:', error);
    return [];
  }
};

// =====================
// DAILY MATCHES
// =====================

// Get daily matches data
const getDailyMatches = async (days = 30) => {
  try {
    const { start, end } = getDateRange(days);
    const startKey = dateToKey(start);
    const endKey = dateToKey(end);

    const { data, error } = await supabase
      .from('fact_daily_matches')
      .select(`
        *,
        dim_date (
          full_date,
          day_name
        )
      `)
      .gte('date_key', startKey)
      .lte('date_key', endKey)
      .order('date_key', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching daily matches:', error);
    return [];
  }
};

// =====================
// GRADUATION YEAR STATS
// =====================

// Get matches by graduation year
const getMatchesByGraduationYear = async (days = 30) => {
  try {
    const { start, end } = getDateRange(days);
    const startKey = dateToKey(start);
    const endKey = dateToKey(end);

    const { data, error } = await supabase
      .from('fact_matches_by_graduation_year')
      .select(`
        *,
        dim_date (
          full_date
        )
      `)
      .gte('date_key', startKey)
      .lte('date_key', endKey)
      .order('date_key', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching matches by graduation year:', error);
    return [];
  }
};

// Get aggregated graduation year stats
const getGraduationYearStats = async (days = 30) => {
  try {
    const data = await getMatchesByGraduationYear(days);
    
    // Aggregate by graduation year
    const yearStats = data.reduce((acc, curr) => {
      const year = curr.graduation_year;
      if (!acc[year]) {
        acc[year] = {
          graduation_year: year,
          total_matches: 0,
          same_year_matches: 0,
          different_year_matches: 0
        };
      }
      acc[year].total_matches += curr.total_matches || 0;
      acc[year].same_year_matches += curr.same_year_matches || 0;
      acc[year].different_year_matches += curr.different_year_matches || 0;
      return acc;
    }, {});

    return Object.values(yearStats).sort((a, b) => a.graduation_year - b.graduation_year);
  } catch (error) {
    console.error('Error fetching graduation year stats:', error);
    return [];
  }
};

// =====================
// POPULAR HOBBIES
// =====================

// Get popular hobbies/interests
const getPopularHobbies = async (days = 30, limit = 10) => {
  try {
    const { start, end } = getDateRange(days);
    const startKey = dateToKey(start);
    const endKey = dateToKey(end);

    const { data, error } = await supabase
      .from('fact_popular_hobbies')
      .select(`
        *,
        dim_date (
          full_date
        )
      `)
      .gte('date_key', startKey)
      .lte('date_key', endKey)
      .order('total_users_with_interest', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching popular hobbies:', error);
    return [];
  }
};

// Get aggregated hobby stats
const getAggregatedHobbies = async (days = 30) => {
  try {
    const { start, end } = getDateRange(days);
    const startKey = dateToKey(start);
    const endKey = dateToKey(end);

    const { data, error } = await supabase
      .from('fact_popular_hobbies')
      .select('*')
      .gte('date_key', startKey)
      .lte('date_key', endKey);

    if (error) throw error;

    // Aggregate by interest name
    const hobbyStats = (data || []).reduce((acc, curr) => {
      const key = curr.interest_name;
      if (!acc[key]) {
        acc[key] = {
          interest_name: curr.interest_name,
          category_name: curr.category_name,
          total_users: 0,
          avg_percentage: 0,
          count: 0
        };
      }
      acc[key].total_users = Math.max(acc[key].total_users, curr.total_users_with_interest || 0);
      acc[key].avg_percentage += curr.percentage_of_total_users || 0;
      acc[key].count += 1;
      return acc;
    }, {});

    // Calculate averages and sort
    return Object.values(hobbyStats)
      .map(hobby => ({
        ...hobby,
        avg_percentage: hobby.avg_percentage / hobby.count
      }))
      .sort((a, b) => b.total_users - a.total_users);
  } catch (error) {
    console.error('Error fetching aggregated hobbies:', error);
    return [];
  }
};

// =====================
// INTEREST MATCH SUCCESS
// =====================

// Get interest match success data
const getInterestMatchSuccess = async (days = 30, limit = 10) => {
  try {
    const { start, end } = getDateRange(days);
    const startKey = dateToKey(start);
    const endKey = dateToKey(end);

    const { data, error } = await supabase
      .from('fact_interest_match_success')
      .select(`
        *,
        dim_date (
          full_date
        )
      `)
      .gte('date_key', startKey)
      .lte('date_key', endKey)
      .order('match_success_rate', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching interest match success:', error);
    return [];
  }
};

// Get aggregated interest match success
const getAggregatedInterestMatchSuccess = async (days = 30) => {
  try {
    const { start, end } = getDateRange(days);
    const startKey = dateToKey(start);
    const endKey = dateToKey(end);

    const { data, error } = await supabase
      .from('fact_interest_match_success')
      .select('*')
      .gte('date_key', startKey)
      .lte('date_key', endKey);

    if (error) throw error;

    // Aggregate by interest name
    const interestStats = (data || []).reduce((acc, curr) => {
      const key = curr.interest_name;
      if (!acc[key]) {
        acc[key] = {
          interest_name: curr.interest_name,
          category_name: curr.category_name,
          total_users: 0,
          total_matches: 0,
          avg_success_rate: 0,
          count: 0
        };
      }
      acc[key].total_users += curr.users_with_interest || 0;
      acc[key].total_matches += curr.matches_made || 0;
      acc[key].avg_success_rate += curr.match_success_rate || 0;
      acc[key].count += 1;
      return acc;
    }, {});

    // Calculate averages and sort
    return Object.values(interestStats)
      .map(interest => ({
        ...interest,
        avg_success_rate: interest.avg_success_rate / interest.count
      }))
      .sort((a, b) => b.avg_success_rate - a.avg_success_rate);
  } catch (error) {
    console.error('Error fetching aggregated interest match success:', error);
    return [];
  }
};

// =====================
// GENDER DISTRIBUTION
// =====================

// Get gender distribution data
const getGenderDistribution = async (days = 30) => {
  try {
    const { start, end } = getDateRange(days);
    const startKey = dateToKey(start);
    const endKey = dateToKey(end);

    const { data, error } = await supabase
      .from('fact_gender_distribution')
      .select(`
        *,
        dim_date (
          full_date
        )
      `)
      .gte('date_key', startKey)
      .lte('date_key', endKey)
      .order('date_key', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching gender distribution:', error);
    return [];
  }
};

// Get aggregated gender stats
const getAggregatedGenderStats = async (days = 30) => {
  try {
    const data = await getGenderDistribution(days);
    
    // Aggregate by gender
    const genderStats = data.reduce((acc, curr) => {
      const gender = curr.gender;
      if (!acc[gender]) {
        acc[gender] = {
          gender: gender,
          total_users: 0,
          total_active_users: 0,
          total_likes: 0,
          total_matches: 0,
          avg_likes_per_user: 0,
          count: 0
        };
      }
      acc[gender].total_users = Math.max(acc[gender].total_users, curr.total_users || 0);
      acc[gender].total_active_users += curr.active_users || 0;
      acc[gender].total_likes += curr.total_likes_sent || 0;
      acc[gender].total_matches += curr.total_matches || 0;
      acc[gender].avg_likes_per_user += curr.avg_likes_per_user || 0;
      acc[gender].count += 1;
      return acc;
    }, {});

    // Calculate averages
    return Object.values(genderStats).map(stat => ({
      ...stat,
      avg_likes_per_user: stat.avg_likes_per_user / stat.count,
      avg_active_users: stat.total_active_users / stat.count
    }));
  } catch (error) {
    console.error('Error fetching aggregated gender stats:', error);
    return [];
  }
};

// =====================
// OVERVIEW & TRENDS
// =====================

// Get overview statistics (latest snapshot)
const getOverviewStats = async () => {
  try {
    // Get most recent date_key
    const { data: latestDate, error: dateError } = await supabase
      .from('dim_date')
      .select('date_key')
      .order('date_key', { ascending: false })
      .limit(1)
      .single();

    if (dateError) throw dateError;

    const dateKey = latestDate.date_key;

    // Fetch all stats for the latest date
    const [users, likes, matches, gender] = await Promise.all([
      supabase.from('fact_daily_active_users').select('*').eq('date_key', dateKey).single(),
      supabase.from('fact_daily_likes').select('*').eq('date_key', dateKey).single(),
      supabase.from('fact_daily_matches').select('*').eq('date_key', dateKey).single(),
      supabase.from('fact_gender_distribution').select('*').eq('date_key', dateKey)
    ]);

    return {
      activeUsers: users.data || {},
      likes: likes.data || {},
      matches: matches.data || {},
      genderDistribution: gender.data || []
    };
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    return {
      activeUsers: {},
      likes: {},
      matches: {},
      genderDistribution: []
    };
  }
};

// Get trend data for dashboard
const getTrendData = async (days = 7) => {
  try {
    const [users, likes, matches] = await Promise.all([
      getDailyActiveUsers(days),
      getDailyLikes(days),
      getDailyMatches(days)
    ]);

    return {
      users,
      likes,
      matches
    };
  } catch (error) {
    console.error('Error fetching trend data:', error);
    return {
      users: [],
      likes: [],
      matches: []
    };
  }
};

// =====================
// EXPORT FUNCTIONS
// =====================

// Export functions for use in other files
window.statistics = {
  getDailyActiveUsers,
  getDailyLikes,
  getDailyMatches,
  getMatchesByGraduationYear,
  getGraduationYearStats,
  getPopularHobbies,
  getAggregatedHobbies,
  getInterestMatchSuccess,
  getAggregatedInterestMatchSuccess,
  getGenderDistribution,
  getAggregatedGenderStats,
  getOverviewStats,
  getTrendData
};

// =====================
// INITIALIZE CHARTS
// =====================

// Initialize all charts when page loads
document.addEventListener('DOMContentLoaded', async () => {
  await initializeCharts();
});

// Initialize all charts
const initializeCharts = async () => {
  try {
    // Fetch all data
    const [
      activeUsers,
      likes,
      matches,
      gradYearStats,
      popularHobbies,
      interestSuccess,
      genderStats,
      trendData
    ] = await Promise.all([
      getDailyActiveUsers(30),
      getDailyLikes(30),
      getDailyMatches(30),
      getGraduationYearStats(30),
      getAggregatedHobbies(30),
      getAggregatedInterestMatchSuccess(30),
      getAggregatedGenderStats(30),
      getTrendData(30)
    ]);

    // Render each chart
    renderActiveUsersChart(activeUsers);
    renderLikesChart(likes);
    renderMatchesChart(matches);
    renderGradYearChart(gradYearStats);
    renderPopularInterestsChart(popularHobbies);
    renderInterestSuccessChart(interestSuccess);
    renderGenderChart(genderStats);
    renderRetentionChart(activeUsers);
  } catch (error) {
    console.error('Error initializing charts:', error);
  }
};

// =====================
// CHART RENDERERS
// =====================

// Render Active Users Chart
const renderActiveUsersChart = (data) => {
  const ctx = document.getElementById('activeUsersChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.dim_date?.full_date || d.date_key),
      datasets: [
        {
          label: 'Total Active Users',
          data: data.map(d => d.total_active_users),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        },
        {
          label: 'New Users',
          data: data.map(d => d.new_users),
          borderColor: 'rgb(54, 162, 235)',
          tension: 0.1
        },
        {
          label: 'Returning Users',
          data: data.map(d => d.returning_users),
          borderColor: 'rgb(153, 102, 255)',
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Daily Active Users'
        }
      }
    }
  });
};

// Render Likes Chart
const renderLikesChart = (data) => {
  const ctx = document.getElementById('likesChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.dim_date?.full_date || d.date_key),
      datasets: [
        {
          label: 'Total Likes Sent',
          data: data.map(d => d.total_likes_sent),
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1
        },
        {
          label: 'Unique Users Who Liked',
          data: data.map(d => d.unique_users_who_liked),
          backgroundColor: 'rgba(255, 159, 64, 0.5)',
          borderColor: 'rgb(255, 159, 64)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Daily Likes Activity'
        }
      }
    }
  });
};

// Render Matches Chart
const renderMatchesChart = (data) => {
  const ctx = document.getElementById('matchesChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.dim_date?.full_date || d.date_key),
      datasets: [
        {
          label: 'Total Matches Created',
          data: data.map(d => d.total_matches_created),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1,
          fill: true
        },
        {
          label: 'Unique Users Matched',
          data: data.map(d => d.unique_users_matched),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.1,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Daily Matches'
        }
      }
    }
  });
};

// Render Graduation Year Chart
const renderGradYearChart = (data) => {
  const ctx = document.getElementById('gradYearChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.graduation_year),
      datasets: [
        {
          label: 'Same Year Matches',
          data: data.map(d => d.same_year_matches),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgb(75, 192, 192)',
          borderWidth: 1
        },
        {
          label: 'Different Year Matches',
          data: data.map(d => d.different_year_matches),
          backgroundColor: 'rgba(153, 102, 255, 0.5)',
          borderColor: 'rgb(153, 102, 255)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Matches by Graduation Year'
        }
      },
      scales: {
        x: {
          stacked: true
        },
        y: {
          stacked: true
        }
      }
    }
  });
};


// Render Popular Interests Chart
const renderPopularInterestsChart = (data) => {
  const ctx = document.getElementById('popularInterestsChart').getContext('2d');
  const topInterests = data.slice(0, 10);
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: topInterests.map(d => d.interest_name),
      datasets: [{
        label: 'Users',
        data: topInterests.map(d => d.total_users),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
          'rgba(255, 159, 64, 0.5)',
          'rgba(199, 199, 199, 0.5)',
          'rgba(83, 102, 255, 0.5)',
          'rgba(255, 99, 255, 0.5)',
          'rgba(99, 255, 132, 0.5)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Top 10 Popular Interests'
        },
        legend: {
          position: 'right'
        }
      }
    }
  });
};

// Render Interest Success Chart
const renderInterestSuccessChart = (data) => {
  const ctx = document.getElementById('interestSuccessChart').getContext('2d');
  const topSuccessful = data.slice(0, 10);
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: topSuccessful.map(d => d.interest_name),
      datasets: [{
        label: 'Match Success Rate (%)',
        data: topSuccessful.map(d => d.avg_success_rate),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Top 10 Interests by Match Success Rate'
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
};
// Render Retention Chart
const renderRetentionChart = (data) => {
  const ctx = document.getElementById('retentionChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.dim_date?.full_date || d.date_key),
      datasets: [{
        label: 'Returning User Rate (%)',
        data: data.map(d => {
          const total = d.total_active_users || 1;
          const returning = d.returning_users || 0;
          return ((returning / total) * 100).toFixed(2);
        }),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        tension: 0.1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'User Retention Rate'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
};

// Render Gender Chart
const renderGenderChart = (data) => {
  const ctx = document.getElementById('genderChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: data.map(d => d.gender),
      datasets: [{
        label: 'Total Users',
        data: data.map(d => d.total_users),
        backgroundColor: [
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 99, 132, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Gender Distribution'
        }
      }
    }
  });
};