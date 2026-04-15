import { useState } from 'react';
import { ChevronDown, Code2, Zap, Eye, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [expandedSection, setExpandedSection] = useState<string | null>('state-management');

  const improvements = [
    {
      id: 'state-management',
      title: 'نظام إدارة الحالة المتطور',
      subtitle: 'Proxy-based State Management',
      icon: Code2,
      description: 'تم استبدال الطريقة التقليدية لجمع البيانات من DOM بنظام يعتمد على Proxy. الآن، بمجرد تغيير أي قيمة في الحالة يتم تحديث الواجهة والحفظ التلقائي بشكل آلي.',
      features: [
        'تتبع آلي للتغييرات في كائن الحالة البرمجية',
        'تحديث فوري وسلس للبيانات دون تأخير',
        'تحسين كبير في الأداء وتقليل استهلاك الذاكرة',
        'فصل المنطق البرمجي عن العرض المرئي'
      ],
      image: 'https://private-us-east-1.manuscdn.com/sessionFile/tFATrhEFItK4e6alYlpkVZ/sandbox/6EMwHm6Ebp4veYp746VsRM-img-2_1771641319000_na1fn_c3RhdGUtbWFuYWdlbWVudC12aXN1YWw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvdEZBVHJoRUZJdEs0ZTZhbFlscGtWWi9zYW5kYm94LzZFTXdIbTZFYnA0dmVZcDc0NlZzUk0taW1nLTJfMTc3MTY0MTMxOTAwMF9uYTFmbl9jM1JoZEdVdGJXRnVZV2RsYldWdWRDMTJhWE4xWVd3LnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=H5mW5wgcw6wvKo6uUL-uILyYRTcPhPXgkyYK54krPJUz4uSxN0EKk7d8qBLYHcCA--XfdvA~7rQesqsc11EVYrU3W9aqoF-gmIPLuOzgzLb2XeAYWmFCpqfpbpJPhcIVHLNTgYtmlqa9WS8U6zpw1H9DKswNlQ5MacgR3fg40GedvYVt7NWA5x5kz7PHRjq-E16TpuFQJT9f1Cfdyktnijq4EZXwayjM7kQ8lgGsMphi~BjljJnLAt4QL6rwuQEyKC0EmYhZb5PptZ6I-DLcx0-PaiUqTZL75iIIAJF9cFR0I-HcbL3MYexGP3M4PrjUcWZyo3WcumdBeZFe9M9tGA__'
    },
    {
      id: 'keyboard-shortcuts',
      title: 'اختصارات لوحة المفاتيح المتقدمة',
      subtitle: 'Advanced Keyboard Shortcuts',
      icon: Keyboard,
      description: 'تم تطوير نظام متقدم لاختيار العناصر مباشرة من فوق البطاقة، مع اختصارات برمجية للتحكم الكامل دون الحاجة لاستخدام الفأرة بشكل مستمر.',
      features: [
        'اختيار العناصر: انقر على أي عنصر في البطاقة لاختياره',
        'التحريك الدقيق: استخدم أسهم لوحة المفاتيح لتحريك العنصر بمقدار 1px',
        'التحريك السريع: اضغط Shift + الأسهم لتحريك بمقدار 10px',
        'الحذف السريع: استخدم مفتاح Delete لحذف العنصر المختار فوراً'
      ],
      image: 'https://private-us-east-1.manuscdn.com/sessionFile/tFATrhEFItK4e6alYlpkVZ/sandbox/6EMwHm6Ebp4veYp746VsRM-img-3_1771641314000_na1fn_a2V5Ym9hcmQtc2hvcnRjdXRzLXZpc3VhbA.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvdEZBVHJoRUZJdEs0ZTZhbFlscGtWWi9zYW5kYm94LzZFTXdIbTZFYnA0dmVZcDc0NlZzUk0taW1nLTNfMTc3MTY0MTMxNDAwMF9uYTFmbl9hMlY1WW05aGNtUXRjMmh2Y25SamRYUnpMWFpwYzNWaGJBLnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=ILbBSLzAZGIngri5L4xodkawPFaBX0fOesfvRL4psD0vBaAi4hsT1ppkJ4A3j1bp-ezULw-9QI3GWUzPEXat8EuyZDrzCxD22nJ-ZuvO9-1OZvojv706jaZ80QZ0kPpZ~l06ho8CyKhAc4-spOija0XdYmQu1LFT398uLR0Hinnajn1hc3zbTTxTisbL6ncv31K1pySmiUtNYcRD7TZRm1YJ7M1B6M2yukkvvk6Q8t61TxuPKUYYdi8mUdqjn8ukYJMjkTrF5n6vxoVsrnSTHGu2jxiRsVN5ru41pnHQKLmjcPXIa~pqUe7W3KFfXZH8TEr1vGRgmqb0g-U5OY4F1Q__'
    },
    {
      id: 'live-preview',
      title: 'المعاينة المباشرة والتحديث الفوري',
      subtitle: 'Live Font & Color Preview',
      icon: Eye,
      description: 'تم ربط خصائص مثل حجم الخط، الألوان، والخطوط بمتغيرات CSS يتم تحديثها برمجياً، مما يتيح رؤية التغييرات فوراً على البطاقة الرقمية.',
      features: [
        'تحديث الألوان بشكل فوري عند الاختيار من لوحة الألوان',
        'معاينة الخطوط المختلفة على الاسم والمسمى الوظيفي',
        'تحديث أحجام الخطوط بسلاسة دون إعادة تحميل',
        'تجربة تحرير أكثر سلاسة (Real-time Preview)'
      ],
      image: 'https://private-us-east-1.manuscdn.com/sessionFile/tFATrhEFItK4e6alYlpkVZ/sandbox/6EMwHm6Ebp4veYp746VsRM-img-4_1771641319000_na1fn_bGl2ZS1wcmV2aWV3LXZpc3VhbA.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvdEZBVHJoRUZJdEs0ZTZhbFlscGtWWi9zYW5kYm94LzZFTXdIbTZFYnA0dmVZcDc0NlZzUk0taW1nLTRfMTc3MTY0MTMxOTAwMF9uYTFmbl9iR2wyWlMxd2NtVjJhV1YzTFhacGMzVmhiQS5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=iLZ-SnBYFP6NJqQU-zqAO~AZWEQOKXAg3vvCXhNl9TB5WQ7xaUPIqghhBzo5i9l6VOD88TQYjhMVCuOahIOqDXRTcfebcU65zMWZkA3lTU6tKOZ~Zd7Vt9kNI3hHoVXFqdmWFehiFsWty~kPbRo6T4v2hSOWc7N4Lqvaps-2JuUq4cvjdxN7rxEhSkDyltBVcN0MlVcSazJtFc3pm259~jdKrK~GKyYAv7Cb-cGbXEKVPJOPDGsbYicULtaz4XlfLF7Y4MBHCaI75JebTBXKuswLMcnH2PhgQ4dQtOgt4mjpQbJqKd2z6hLwzkitBN3H51Q-Ew6KFN56G6O0hEAAFg__'
    },
    {
      id: 'performance',
      title: 'تحسينات الأداء',
      subtitle: 'Performance Optimization',
      icon: Zap,
      description: 'تم تطبيق تقنيات متقدمة لتحسين أداء المحرر، بما في ذلك التحميل الكسول للمكتبات الثقيلة وتقليل استهلاك الذاكرة.',
      features: [
        'تحميل كسول (Lazy Loading) للمكتبات الثقيلة مثل html2canvas و jspdf',
        'تقليل استهلاك الذاكرة من خلال نظام الـ Proxy',
        'تحسين سرعة استجابة الواجهة للمستخدم',
        'تقليل وقت التحميل الأولي للمحرر'
      ],
      image: null
    }
  ];

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                  تحسينات محرر بطاقات الأعمال <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">NFC</span>
                </h1>
                <p className="text-xl text-blue-100 leading-relaxed">
                  اكتشف التحسينات التقنية المتقدمة التي تم تطبيقها على محرر البطاقات الرقمية الذكية، من نظام إدارة الحالة المتطور إلى اختصارات لوحة المفاتيح المتقدمة.
                </p>
              </div>
              <div className="flex gap-4">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg">
                  استكشف المزيد
                </Button>
                <Button variant="outline" className="border-blue-400 text-blue-400 hover:bg-blue-400/10 px-8 py-6 text-lg">
                  اقرأ التقرير
                </Button>
              </div>
            </div>

            <div className="hidden lg:block">
              <img
                src="https://private-us-east-1.manuscdn.com/sessionFile/tFATrhEFItK4e6alYlpkVZ/sandbox/6EMwHm6Ebp4veYp746VsRM-img-1_1771641327000_na1fn_bmZjLWhlcm8tYmFubmVy.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvdEZBVHJoRUZJdEs0ZTZhbFlscGtWWi9zYW5kYm94LzZFTXdIbTZFYnA0dmVZcDc0NlZzUk0taW1nLTFfMTc3MTY0MTMyNzAwMF9uYTFmbl9ibVpqTFdobmNtOHRZbUZ1Ym1WeS5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=hPTHu0rbYgU~n4aCAXID4sP-WNly0mRWNeTMOaF8OwL9zIXMYKcnC6FZE89zUCW~9udLlvOmlgzoMX-H71ZymUMtGUUtDg-pWT-Z3gcWv7ouEpTT2VQMnrrIv2ZhqP3C2eBrSAoaXDf5g3V1uzd5YdUrJTG9ujGRKzfs2qmYTyFuVBFmC7BMrXI4hBfvvburRoATxs9tRCVpo3Oxk3cf5mOH3IhbutWRYX35HJXWyreA41NjrgGSUKQUtaeeS8gopJdGz54HK9ybMPRLnYe2WsTSvI1BE5ZyvL39KU0NG-I9yTB~gjmTXq0OmUBlzMpzDJjV6QfE55ZOAeJxLKDpaA__"
                alt="NFC Technology"
                className="w-full h-auto rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Improvements Section */}
      <section className="py-20 bg-slate-800/50 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">التحسينات الرئيسية</h2>
            <p className="text-xl text-blue-200">اكتشف كل ميزة من الميزات المطورة بالتفصيل</p>
          </div>

          <div className="space-y-6">
            {improvements.map((improvement) => {
              const IconComponent = improvement.icon;
              const isExpanded = expandedSection === improvement.id;

              return (
                <div
                  key={improvement.id}
                  className="bg-slate-700/50 backdrop-blur border border-blue-500/20 rounded-lg overflow-hidden hover:border-blue-500/50 transition-all duration-300"
                >
                  <button
                    onClick={() => toggleSection(improvement.id)}
                    className="w-full px-6 py-6 flex items-center justify-between hover:bg-slate-600/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/20 rounded-lg">
                        <IconComponent className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-white">{improvement.title}</h3>
                        <p className="text-sm text-blue-300">{improvement.subtitle}</p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-6 h-6 text-blue-400 transition-transform duration-300 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-blue-500/20 space-y-6">
                      <p className="text-blue-100 leading-relaxed">{improvement.description}</p>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-semibold text-white">الميزات الرئيسية:</h4>
                          <ul className="space-y-3">
                            {improvement.features.map((feature, idx) => (
                              <li key={idx} className="flex gap-3 text-blue-100">
                                <span className="text-blue-400 font-bold">✓</span>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {improvement.image && (
                          <div className="rounded-lg overflow-hidden border border-blue-500/30">
                            <img
                              src={improvement.image}
                              alt={improvement.title}
                              className="w-full h-auto"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-center space-y-6">
            <h2 className="text-4xl font-bold text-white">جاهز لاستكشاف المحرر المحسّن؟</h2>
            <p className="text-xl text-blue-50 max-w-2xl mx-auto">
              اختبر جميع الميزات الجديدة والتحسينات التقنية المتقدمة في محرر بطاقات الأعمال NFC.
            </p>
            <div className="flex gap-4 justify-center">
              <Button className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg font-semibold">
                ابدأ الآن
              </Button>
              <Button variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg">
                اقرأ التوثيق
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-blue-500/20 py-12 bg-slate-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-blue-300">
            <p>© 2026 NFC Editor Improvements. جميع الحقوق محفوظة.</p>
            <p className="text-sm mt-2">تم تطويره بواسطة Manus AI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
