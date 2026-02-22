/**
 * نظام إدارة الأذونات والتحكم في الوصول (Permissions & Access Control)
 * 
 * يوفر هذا الملف نظام متقدم للتحكم في الوصول والأذونات
 */

/**
 * تعريف مستويات الوصول
 */
const AccessLevel = {
  OWNER: 'owner',           // مالك - كل الصلاحيات
  EDITOR: 'editor',         // محرر - تحرير وحفظ
  VIEWER: 'viewer',         // عارض - قراءة فقط
  GUEST: 'guest'            // ضيف - وصول محدود
};

/**
 * تعريف الأذونات
 */
const Permissions = {
  VIEW: 'view',             // عرض
  EDIT: 'edit',             // تحرير
  DELETE: 'delete',         // حذف
  SHARE: 'share',           // مشاركة
  EXPORT: 'export',         // تصدير
  MANAGE_PERMISSIONS: 'manage_permissions' // إدارة الأذونات
};

/**
 * فئة المستخدم (User)
 */
class User {
  constructor(id, name, email) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.createdAt = new Date();
  }

  /**
   * الحصول على معلومات المستخدم
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      createdAt: this.createdAt.toISOString()
    };
  }
}

/**
 * فئة الوصول (Access)
 */
class Access {
  constructor(userId, accessLevel, expiresAt = null) {
    this.userId = userId;
    this.accessLevel = accessLevel;
    this.grantedAt = new Date();
    this.expiresAt = expiresAt;
    this.permissions = this.getPermissionsForLevel(accessLevel);
  }

  /**
   * الحصول على الأذونات حسب مستوى الوصول
   */
  getPermissionsForLevel(level) {
    const permissionMap = {
      [AccessLevel.OWNER]: [
        Permissions.VIEW,
        Permissions.EDIT,
        Permissions.DELETE,
        Permissions.SHARE,
        Permissions.EXPORT,
        Permissions.MANAGE_PERMISSIONS
      ],
      [AccessLevel.EDITOR]: [
        Permissions.VIEW,
        Permissions.EDIT,
        Permissions.EXPORT
      ],
      [AccessLevel.VIEWER]: [
        Permissions.VIEW
      ],
      [AccessLevel.GUEST]: [
        Permissions.VIEW
      ]
    };
    return permissionMap[level] || [];
  }

  /**
   * التحقق من انتهاء الصلاحية
   */
  isExpired() {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  /**
   * التحقق من وجود أذن محددة
   */
  hasPermission(permission) {
    if (this.isExpired()) return false;
    return this.permissions.includes(permission);
  }

  /**
   * الحصول على معلومات الوصول
   */
  getInfo() {
    return {
      userId: this.userId,
      accessLevel: this.accessLevel,
      grantedAt: this.grantedAt.toISOString(),
      expiresAt: this.expiresAt ? this.expiresAt.toISOString() : null,
      isExpired: this.isExpired(),
      permissions: this.permissions
    };
  }
}

/**
 * فئة مدير الأذونات (Permission Manager)
 */
class PermissionManager {
  constructor(ownerId) {
    this.ownerId = ownerId;
    this.accesses = {};
    this.accessLog = [];
    
    // إضافة المالك بصلاحيات كاملة
    this.accesses[ownerId] = new Access(ownerId, AccessLevel.OWNER);
  }

  /**
   * منح الوصول لمستخدم
   */
  grantAccess(userId, accessLevel, expiresAt = null) {
    if (!Object.values(AccessLevel).includes(accessLevel)) {
      console.error('❌ مستوى وصول غير صحيح:', accessLevel);
      return null;
    }
    
    const access = new Access(userId, accessLevel, expiresAt);
    this.accesses[userId] = access;
    
    this.logAction('grant', userId, accessLevel);
    console.log('✅ تم منح الوصول للمستخدم:', userId);
    
    return access;
  }

  /**
   * إلغاء الوصول لمستخدم
   */
  revokeAccess(userId) {
    if (userId === this.ownerId) {
      console.error('❌ لا يمكن إلغاء وصول المالك');
      return false;
    }
    
    delete this.accesses[userId];
    this.logAction('revoke', userId);
    console.log('✅ تم إلغاء وصول المستخدم:', userId);
    
    return true;
  }

  /**
   * تحديث مستوى الوصول
   */
  updateAccessLevel(userId, newAccessLevel) {
    if (!this.accesses[userId]) {
      console.error('❌ المستخدم ليس لديه وصول');
      return null;
    }
    
    const oldLevel = this.accesses[userId].accessLevel;
    this.accesses[userId].accessLevel = newAccessLevel;
    this.accesses[userId].permissions = this.accesses[userId].getPermissionsForLevel(newAccessLevel);
    
    this.logAction('update', userId, newAccessLevel);
    console.log(`✅ تم تحديث مستوى الوصول من ${oldLevel} إلى ${newAccessLevel}`);
    
    return this.accesses[userId];
  }

  /**
   * التحقق من وجود أذن
   */
  hasPermission(userId, permission) {
    const access = this.accesses[userId];
    if (!access) return false;
    return access.hasPermission(permission);
  }

  /**
   * الحصول على مستوى الوصول
   */
  getAccessLevel(userId) {
    const access = this.accesses[userId];
    return access ? access.accessLevel : null;
  }

  /**
   * الحصول على جميع المستخدمين الذين لديهم وصول
   */
  getAllUsers() {
    return Object.entries(this.accesses).map(([userId, access]) => ({
      userId: userId,
      ...access.getInfo()
    }));
  }

  /**
   * الحصول على المستخدمين حسب مستوى الوصول
   */
  getUsersByAccessLevel(accessLevel) {
    return Object.entries(this.accesses)
      .filter(([_, access]) => access.accessLevel === accessLevel)
      .map(([userId, access]) => ({
        userId: userId,
        ...access.getInfo()
      }));
  }

  /**
   * تسجيل الإجراء
   */
  logAction(action, userId, details = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      action: action,
      userId: userId,
      details: details
    };
    this.accessLog.push(entry);
  }

  /**
   * الحصول على سجل الوصول
   */
  getAccessLog() {
    return this.accessLog;
  }

  /**
   * مسح سجل الوصول
   */
  clearAccessLog() {
    this.accessLog = [];
  }

  /**
   * تصدير الأذونات
   */
  exportPermissions() {
    return JSON.stringify({
      ownerId: this.ownerId,
      accesses: Object.entries(this.accesses).map(([userId, access]) => ({
        userId: userId,
        ...access.getInfo()
      })),
      accessLog: this.accessLog
    }, null, 2);
  }

  /**
   * استيراد الأذونات
   */
  importPermissions(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      this.ownerId = data.ownerId;
      this.accesses = {};
      
      data.accesses.forEach(accessData => {
        const access = new Access(
          accessData.userId,
          accessData.accessLevel,
          accessData.expiresAt ? new Date(accessData.expiresAt) : null
        );
        this.accesses[accessData.userId] = access;
      });
      
      this.accessLog = data.accessLog || [];
      console.log('✅ تم استيراد الأذونات بنجاح');
      return true;
    } catch (error) {
      console.error('❌ فشل استيراد الأذونات:', error);
      return false;
    }
  }
}

/**
 * فئة نظام المشاركة (Sharing System)
 */
class SharingSystem {
  constructor(permissionManager) {
    this.permissionManager = permissionManager;
    this.shares = {};
  }

  /**
   * إنشاء رابط مشاركة
   */
  createShareLink(accessLevel = AccessLevel.VIEWER, expiresAt = null) {
    const shareId = 'share_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    this.shares[shareId] = {
      id: shareId,
      accessLevel: accessLevel,
      createdAt: new Date(),
      expiresAt: expiresAt,
      accessCount: 0
    };
    
    console.log('✅ تم إنشاء رابط مشاركة:', shareId);
    return shareId;
  }

  /**
   * الوصول عبر رابط مشاركة
   */
  accessViaShareLink(shareId, userId) {
    const share = this.shares[shareId];
    if (!share) {
      console.error('❌ رابط المشاركة غير موجود');
      return false;
    }
    
    if (share.expiresAt && new Date() > share.expiresAt) {
      console.error('❌ رابط المشاركة منتهي الصلاحية');
      return false;
    }
    
    // منح الوصول للمستخدم
    this.permissionManager.grantAccess(userId, share.accessLevel, share.expiresAt);
    share.accessCount++;
    
    console.log('✅ تم الوصول عبر رابط المشاركة');
    return true;
  }

  /**
   * حذف رابط مشاركة
   */
  deleteShareLink(shareId) {
    if (!this.shares[shareId]) {
      console.error('❌ رابط المشاركة غير موجود');
      return false;
    }
    
    delete this.shares[shareId];
    console.log('✅ تم حذف رابط المشاركة');
    return true;
  }

  /**
   * الحصول على معلومات رابط المشاركة
   */
  getShareLinkInfo(shareId) {
    const share = this.shares[shareId];
    if (!share) return null;
    
    return {
      id: share.id,
      accessLevel: share.accessLevel,
      createdAt: share.createdAt.toISOString(),
      expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
      accessCount: share.accessCount,
      isExpired: share.expiresAt ? new Date() > share.expiresAt : false
    };
  }

  /**
   * الحصول على جميع روابط المشاركة
   */
  getAllShareLinks() {
    return Object.values(this.shares).map(share => ({
      id: share.id,
      accessLevel: share.accessLevel,
      createdAt: share.createdAt.toISOString(),
      expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
      accessCount: share.accessCount,
      isExpired: share.expiresAt ? new Date() > share.expiresAt : false
    }));
  }
}

// تصدير الفئات والثوابت
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AccessLevel,
    Permissions,
    User,
    Access,
    PermissionManager,
    SharingSystem
  };
}
