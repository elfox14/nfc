/**
 * نظام البحث والتصفية (Search & Filter System)
 * 
 * يوفر هذا النظام إمكانيات بحث وتصفية متقدمة
 */

/**
 * فئة محرك البحث (Search Engine)
 */
class SearchEngine {
  constructor(options = {}) {
    this.items = [];
    this.index = new Map();
    this.searchHistory = [];
    this.maxHistorySize = options.maxHistorySize || 50;
  }

  /**
   * إضافة عناصر للفهرس
   */
  addItems(items) {
    this.items = items;
    this.buildIndex();
  }

  /**
   * بناء الفهرس
   */
  buildIndex() {
    this.index.clear();
    
    this.items.forEach((item, index) => {
      // فهرسة الخصائص النصية
      Object.values(item).forEach(value => {
        if (typeof value === 'string') {
          const words = value.toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (!this.index.has(word)) {
              this.index.set(word, []);
            }
            this.index.get(word).push(index);
          });
        }
      });
    });
    
    console.log('✅ تم بناء الفهرس');
  }

  /**
   * البحث البسيط
   */
  search(query) {
    if (!query || query.trim() === '') {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    this.logSearch(query);

    const results = [];
    const resultSet = new Set();

    // البحث في الفهرس
    const words = normalizedQuery.split(/\s+/);
    words.forEach(word => {
      const indices = this.index.get(word) || [];
      indices.forEach(index => resultSet.add(index));
    });

    // جمع النتائج
    resultSet.forEach(index => {
      results.push({
        item: this.items[index],
        score: this.calculateRelevance(this.items[index], normalizedQuery)
      });
    });

    // ترتيب النتائج حسب الملاءمة
    results.sort((a, b) => b.score - a.score);

    console.log(`🔍 تم العثور على ${results.length} نتيجة`);
    return results.map(r => r.item);
  }

  /**
   * البحث المتقدم
   */
  advancedSearch(criteria) {
    let results = this.items;

    // تطبيق معايير البحث
    Object.entries(criteria).forEach(([key, value]) => {
      results = results.filter(item => {
        if (typeof value === 'string') {
          return item[key] && item[key].toLowerCase().includes(value.toLowerCase());
        } else if (Array.isArray(value)) {
          return value.includes(item[key]);
        } else if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
          return item[key] >= value.min && item[key] <= value.max;
        }
        return true;
      });
    });

    console.log(`🔍 تم العثور على ${results.length} نتيجة`);
    return results;
  }

  /**
   * حساب درجة الملاءمة
   */
  calculateRelevance(item, query) {
    let score = 0;
    const queryWords = query.split(/\s+/);

    Object.entries(item).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        queryWords.forEach(word => {
          if (lowerValue === word) score += 10; // تطابق تام
          else if (lowerValue.includes(word)) score += 5; // تطابق جزئي
          else if (lowerValue.startsWith(word)) score += 3; // يبدأ بـ
        });
      }
    });

    return score;
  }

  /**
   * تسجيل البحث
   */
  logSearch(query) {
    const entry = {
      timestamp: new Date().toISOString(),
      query: query
    };

    this.searchHistory.push(entry);

    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory.shift();
    }
  }

  /**
   * الحصول على سجل البحث
   */
  getSearchHistory() {
    return this.searchHistory;
  }

  /**
   * الحصول على البحث الشهير
   */
  getPopularSearches(limit = 10) {
    const searchMap = {};

    this.searchHistory.forEach(entry => {
      searchMap[entry.query] = (searchMap[entry.query] || 0) + 1;
    });

    return Object.entries(searchMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query, count]) => ({ query, count }));
  }

  /**
   * مسح سجل البحث
   */
  clearSearchHistory() {
    this.searchHistory = [];
  }
}

/**
 * فئة نظام التصفية (Filter System)
 */
class FilterSystem {
  constructor() {
    this.filters = [];
    this.activeFilters = [];
  }

  /**
   * إضافة فلتر
   */
  addFilter(id, name, type, options = {}) {
    const filter = {
      id: id,
      name: name,
      type: type, // text, select, range, checkbox, date
      options: options,
      value: null
    };

    this.filters.push(filter);
    console.log('✅ تم إضافة فلتر:', name);
    return filter;
  }

  /**
   * تعيين قيمة الفلتر
   */
  setFilterValue(filterId, value) {
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) {
      console.error('❌ الفلتر غير موجود');
      return false;
    }

    filter.value = value;

    // إضافة إلى الفلاتر النشطة
    const activeIndex = this.activeFilters.findIndex(f => f.id === filterId);
    if (activeIndex === -1) {
      this.activeFilters.push(filter);
    } else {
      this.activeFilters[activeIndex] = filter;
    }

    console.log('✅ تم تعيين قيمة الفلتر');
    return true;
  }

  /**
   * إزالة فلتر من الفلاتر النشطة
   */
  removeActiveFilter(filterId) {
    const index = this.activeFilters.findIndex(f => f.id === filterId);
    if (index === -1) {
      console.error('❌ الفلتر النشط غير موجود');
      return false;
    }

    this.activeFilters.splice(index, 1);
    console.log('✅ تم إزالة الفلتر');
    return true;
  }

  /**
   * تطبيق الفلاتر على البيانات
   */
  applyFilters(items) {
    if (this.activeFilters.length === 0) {
      return items;
    }

    return items.filter(item => {
      return this.activeFilters.every(filter => {
        switch (filter.type) {
          case 'text':
            return item[filter.id] && 
                   item[filter.id].toLowerCase().includes(filter.value.toLowerCase());
          
          case 'select':
            return item[filter.id] === filter.value;
          
          case 'checkbox':
            return filter.value ? item[filter.id] === true : true;
          
          case 'range':
            return item[filter.id] >= filter.value.min && 
                   item[filter.id] <= filter.value.max;
          
          case 'date':
            const itemDate = new Date(item[filter.id]);
            const filterDate = new Date(filter.value);
            return itemDate.toDateString() === filterDate.toDateString();
          
          default:
            return true;
        }
      });
    });
  }

  /**
   * الحصول على الفلاتر النشطة
   */
  getActiveFilters() {
    return this.activeFilters.map(f => ({
      id: f.id,
      name: f.name,
      value: f.value
    }));
  }

  /**
   * مسح جميع الفلاتر
   */
  clearAllFilters() {
    this.activeFilters = [];
    console.log('✅ تم مسح جميع الفلاتر');
  }

  /**
   * الحصول على إحصائيات الفلاتر
   */
  getFilterStats() {
    return {
      totalFilters: this.filters.length,
      activeFilters: this.activeFilters.length
    };
  }
}

/**
 * فئة نظام الترتيب (Sort System)
 */
class SortSystem {
  constructor() {
    this.sortOptions = [];
    this.currentSort = null;
  }

  /**
   * إضافة خيار ترتيب
   */
  addSortOption(id, name, field, direction = 'asc') {
    const option = {
      id: id,
      name: name,
      field: field,
      direction: direction
    };

    this.sortOptions.push(option);
    console.log('✅ تم إضافة خيار ترتيب:', name);
    return option;
  }

  /**
   * تطبيق الترتيب
   */
  sort(items, sortId) {
    const option = this.sortOptions.find(o => o.id === sortId);
    if (!option) {
      console.error('❌ خيار الترتيب غير موجود');
      return items;
    }

    this.currentSort = option;

    const sorted = [...items].sort((a, b) => {
      const aValue = a[option.field];
      const bValue = b[option.field];

      if (typeof aValue === 'string') {
        return option.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return option.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
    });

    console.log('✅ تم تطبيق الترتيب');
    return sorted;
  }

  /**
   * الحصول على خيارات الترتيب
   */
  getSortOptions() {
    return this.sortOptions;
  }

  /**
   * الحصول على الترتيب الحالي
   */
  getCurrentSort() {
    return this.currentSort;
  }
}

// تصدير الفئات
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SearchEngine,
    FilterSystem,
    SortSystem
  };
}
