/** @jest-environment jsdom */
'use strict';

describe('editor cloud save resilience', () => {
  beforeEach(() => {
    jest.resetModules();
    document.documentElement.lang = 'ar';
    document.body.innerHTML = `
      <button id="save-share-btn"><span id="save-btn-text">حفظ و مشاركة</span></button>
      <button class="mobile-action-btn" data-editor-command="design.save-share">حفظ</button>
      <button id="mobile-save-btn"><span>حفظ</span></button>
    `;
    localStorage.setItem('authUser', JSON.stringify({ userId: 'test-user' }));

    global.Auth = window.Auth = { isLoggedIn: jest.fn(() => true), refreshSession: jest.fn() };
    global.DOMElements = window.DOMElements = {
      cardFront: document.createElement('section'),
      cardBack: document.createElement('section')
    };
    global.StateManager = window.StateManager = {
      getStateObject: jest.fn(() => ({ inputs: {}, imageUrls: {} }))
    };
    global.ShareManager = window.ShareManager = {
      captureAndUploadCard: jest.fn(async () => {
        throw new Error('Canvas returned an empty PNG.');
      }),
      saveDesign: jest.fn(async () => 'saved-design-id'),
      performShare: jest.fn()
    };
    global.UIManager = window.UIManager = { announce: jest.fn() };
    global.MobileUtils = window.MobileUtils = {
      isMobile: jest.fn(() => false),
      showMobileToast: jest.fn()
    };
    global.i18nMain = window.i18nMain = {
      shareTitle: 'بطاقة العمل الرقمية الخاصة بي',
      shareText: 'اطلع على بطاقتي الرقمية:'
    };
    global.customConfirm = window.customConfirm = jest.fn(async () => true);
    window.EditorUIState = { set: jest.fn() };
    global.alert = window.alert = jest.fn();

    require('../editor-user-status');
  });

  afterEach(() => {
    localStorage.clear();
    [
      'Auth', 'DOMElements', 'StateManager', 'ShareManager', 'UIManager',
      'MobileUtils', 'i18nMain', 'customConfirm', 'alert', 'EditorUserStatus'
    ].forEach(key => {
      delete global[key];
      delete window[key];
    });
    delete window.EditorUIState;
  });

  test('saves design data when optional preview capture fails', async () => {
    await window.EditorUserStatus.saveToCloud(true);

    expect(ShareManager.captureAndUploadCard).toHaveBeenCalledTimes(2);
    expect(ShareManager.saveDesign).toHaveBeenCalledTimes(1);
    expect(ShareManager.saveDesign.mock.calls[0][0]).toMatchObject({
      sharedToGallery: true,
      imageUrls: {}
    });
    expect(customConfirm).toHaveBeenCalledWith('هل تريد عرض تصميمك في صفحة المعرض؟');
    expect(alert).not.toHaveBeenCalled();
    expect(window.EditorUIState.set).toHaveBeenCalledWith('saved');
    expect(UIManager.announce).toHaveBeenCalledWith(
      expect.stringContaining('تم حفظ التصميم بنجاح')
    );
    expect(ShareManager.performShare).toHaveBeenCalledTimes(1);
  });
});
