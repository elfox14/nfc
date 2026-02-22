/**
 * Undo/Redo System - نظام التراجع والإعادة
 * 
 * يوفر هذا الملف نظاماً متقدماً للتراجع والإعادة عن التغييرات
 * باستخدام نمط Command Pattern
 */

class UndoRedoManager {
  /**
   * إنشاء مدير التراجع والإعادة
   * @param {number} maxHistorySize - الحد الأقصى لعدد الخطوات المحفوظة (افتراضي: 50)
   */
  constructor(maxHistorySize = 50) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistorySize = maxHistorySize;
    this.listeners = [];
    this.isExecuting = false;
  }

  /**
   * تسجيل أمر جديد (Command) في السجل
   * @param {object} command - الأمر المراد تسجيله
   * @param {function} command.execute - دالة تنفيذ الأمر
   * @param {function} command.undo - دالة التراجع عن الأمر
   * @param {string} command.description - وصف الأمر (اختياري)
   */
  execute(command) {
    if (!command.execute || !command.undo) {
      console.error('الأمر يجب أن يحتوي على دوال execute و undo');
      return;
    }

    try {
      this.isExecuting = true;

      // تنفيذ الأمر
      command.execute();

      // إضافة الأمر إلى سجل التراجع
      this.undoStack.push(command);

      // إذا تجاوزنا الحد الأقصى، احذف الأمر الأقدم
      if (this.undoStack.length > this.maxHistorySize) {
        this.undoStack.shift();
      }

      // مسح سجل الإعادة عند تنفيذ أمر جديد
      this.redoStack = [];

      // إخطار المستمعين
      this.notifyListeners();
    } catch (error) {
      console.error('خطأ في تنفيذ الأمر:', error);
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * التراجع عن آخر أمر
   */
  undo() {
    if (this.undoStack.length === 0) {
      console.warn('لا توجد أوامر للتراجع عنها');
      return;
    }

    try {
      this.isExecuting = true;

      const command = this.undoStack.pop();

      // تنفيذ دالة التراجع
      command.undo();

      // إضافة الأمر إلى سجل الإعادة
      this.redoStack.push(command);

      // إخطار المستمعين
      this.notifyListeners();
    } catch (error) {
      console.error('خطأ في التراجع:', error);
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * الإعادة للأمر الذي تم التراجع عنه
   */
  redo() {
    if (this.redoStack.length === 0) {
      console.warn('لا توجد أوامر للإعادة');
      return;
    }

    try {
      this.isExecuting = true;

      const command = this.redoStack.pop();

      // تنفيذ الأمر مرة أخرى
      command.execute();

      // إضافة الأمر إلى سجل التراجع
      this.undoStack.push(command);

      // إخطار المستمعين
      this.notifyListeners();
    } catch (error) {
      console.error('خطأ في الإعادة:', error);
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * التحقق من إمكانية التراجع
   * @returns {boolean}
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * التحقق من إمكانية الإعادة
   * @returns {boolean}
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * الحصول على وصف آخر أمر يمكن التراجع عنه
   * @returns {string}
   */
  getUndoDescription() {
    if (this.undoStack.length === 0) return '';
    const lastCommand = this.undoStack[this.undoStack.length - 1];
    return lastCommand.description || 'تراجع';
  }

  /**
   * الحصول على وصف آخر أمر يمكن إعادته
   * @returns {string}
   */
  getRedoDescription() {
    if (this.redoStack.length === 0) return '';
    const lastCommand = this.redoStack[this.redoStack.length - 1];
    return lastCommand.description || 'إعادة';
  }

  /**
   * مسح السجل بالكامل
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyListeners();
  }

  /**
   * الحصول على عدد الأوامر في سجل التراجع
   * @returns {number}
   */
  getUndoCount() {
    return this.undoStack.length;
  }

  /**
   * الحصول على عدد الأوامر في سجل الإعادة
   * @returns {number}
   */
  getRedoCount() {
    return this.redoStack.length;
  }

  /**
   * إضافة مستمع للتغييرات
   * @param {function} listener - دالة يتم استدعاؤها عند حدوث تغيير
   */
  addListener(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  }

  /**
   * إزالة مستمع
   * @param {function} listener - الدالة المراد إزالتها
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * إخطار جميع المستمعين بالتغييرات
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener({
          canUndo: this.canUndo(),
          canRedo: this.canRedo(),
          undoDescription: this.getUndoDescription(),
          redoDescription: this.getRedoDescription()
        });
      } catch (error) {
        console.error('خطأ في استدعاء المستمع:', error);
      }
    });
  }
}

/**
 * أمثلة على الأوامر (Commands) المختلفة
 */

/**
 * أمر لتغيير خاصية في البطاقة
 */
class ChangePropertyCommand {
  constructor(element, property, oldValue, newValue, description) {
    this.element = element;
    this.property = property;
    this.oldValue = oldValue;
    this.newValue = newValue;
    this.description = description || `تغيير ${property}`;
  }

  execute() {
    if (this.property.includes('.')) {
      // للخصائص المتداخلة مثل style.color
      const parts = this.property.split('.');
      let obj = this.element;
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = this.newValue;
    } else {
      this.element[this.property] = this.newValue;
    }
  }

  undo() {
    if (this.property.includes('.')) {
      const parts = this.property.split('.');
      let obj = this.element;
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = this.oldValue;
    } else {
      this.element[this.property] = this.oldValue;
    }
  }
}

/**
 * أمر لتغيير نمط CSS
 */
class ChangeStyleCommand {
  constructor(element, styleName, oldValue, newValue, description) {
    this.element = element;
    this.styleName = styleName;
    this.oldValue = oldValue;
    this.newValue = newValue;
    this.description = description || `تغيير ${styleName}`;
  }

  execute() {
    this.element.style[this.styleName] = this.newValue;
  }

  undo() {
    this.element.style[this.styleName] = this.oldValue;
  }
}

/**
 * أمر لتغيير محتوى النص
 */
class ChangeTextCommand {
  constructor(element, oldText, newText, description = 'تغيير النص') {
    this.element = element;
    this.oldText = oldText;
    this.newText = newText;
    this.description = description;
  }

  execute() {
    this.element.textContent = this.newText;
  }

  undo() {
    this.element.textContent = this.oldText;
  }
}

/**
 * أمر مركب يجمع عدة أوامر معاً
 */
class CompositeCommand {
  constructor(commands, description = 'عمليات متعددة') {
    this.commands = commands;
    this.description = description;
  }

  execute() {
    this.commands.forEach(cmd => cmd.execute());
  }

  undo() {
    // التراجع بالعكس
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}

// تصدير الفئات
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UndoRedoManager,
    ChangePropertyCommand,
    ChangeStyleCommand,
    ChangeTextCommand,
    CompositeCommand
  };
}
