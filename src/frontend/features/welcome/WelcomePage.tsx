import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Brand from '../../components/ui/Brand';
import Icon from '../../components/ui/Icon';
import Mascot from '../../components/mascot/Mascot';
import { useAmericanSpeech } from '../../hooks/useAmericanSpeech';
import { announceFeedback, unlockAudio } from '../../audio/experience';

const chapters = [
  {
    icon: 'learn' as const,
    tag: '01 · KHÁM PHÁ',
    title: 'Bắt đầu từ điều bạn thích.',
    text: 'Chọn chủ đề IELTS hoặc giao tiếp. Mỗi lượt chỉ vài từ mới, vừa đủ để bắt đầu thật nhẹ nhàng.',
    word: 'grow',
    ipa: '/ɡroʊ/',
    meaning: 'lớn lên, phát triển',
  },
  {
    icon: 'notebook' as const,
    tag: '02 · GHI NHỚ',
    title: 'Từ mới có một ngôi nhà.',
    text: 'Nghe phát âm, xem ví dụ và viết lại. Những từ đã học được lưu vào sổ tay cùng tiến độ của bạn.',
    word: 'discover',
    ipa: '/dɪˈskʌvɚ/',
    meaning: 'khám phá, tìm ra',
  },
  {
    icon: 'review' as const,
    tag: '03 · LỚN LÊN',
    title: 'Gặp lại từ, nhớ lâu hơn.',
    text: 'Quay lại ôn những từ đến hạn. Linh thú sẽ đồng hành, nhắc bước tiếp theo và cổ vũ mỗi lần bạn thử.',
    word: 'remember',
    ipa: '/rɪˈmembɚ/',
    meaning: 'nhớ, ghi nhớ',
  },
];

export default function WelcomePage() {
  const [chapter, setChapter] = useState(0);
  const [demo, setDemo] = useState<'front' | 'recall' | 'done'>('front');
  const [answer, setAnswer] = useState('');
  const [notice, setNotice] = useState('');
  const [greeting, setGreeting] = useState(false);
  const [greetingCount, setGreetingCount] = useState(0);
  const choice = useRef<HTMLElement>(null);
  const demoSection = useRef<HTMLElement>(null);
  const speech = useAmericanSpeech(null);
  const current = chapters[chapter]!;
  function show(section: HTMLElement | null) {
    const reduced =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.motion === 'reduced';
    section?.scrollIntoView({
      behavior: reduced ? 'instant' : 'smooth',
      block: 'start',
    });
    section?.focus({ preventScroll: true });
  }
  function tryWord(event: FormEvent) {
    event.preventDefault();
    if (!answer.trim()) return;
    if (answer.trim().toLowerCase() === 'grow') {
      setDemo('done');
      setNotice('Bạn nhớ được “grow” rồi!');
      announceFeedback('correct', `demo:${Date.now()}`);
    } else {
      setNotice('Gần đúng rồi! Từ mình vừa học là “grow”. Bạn thử lại nhé.');
      announceFeedback('retry', `demo-retry:${Date.now()}`);
    }
  }
  return (
    <div className="welcome-page">
      <a
        className="welcome-skip"
        href="#welcome-main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('welcome-main')?.focus();
        }}
      >
        Đến nội dung chính
      </a>
      <header className="welcome-header">
        <a href="#/" aria-label="EnglishVocab — trang giới thiệu">
          <Brand />
        </a>
        <nav aria-label="Điều hướng trang giới thiệu">
          <button
            type="button"
            onClick={() => show(document.getElementById('welcome-journey'))}
          >
            Cách học
          </button>
          <button type="button" onClick={() => show(demoSection.current)}>
            Học thử
          </button>
        </nav>
        <div className="welcome-header-actions">
          <a href="#/login">Đăng nhập</a>
          <a className="welcome-button welcome-button--small" href="#/register">
            Tạo tài khoản <Icon name="arrow" />
          </a>
        </div>
      </header>
      <main id="welcome-main" tabIndex={-1}>
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-hero-copy">
            <span className="welcome-eyebrow">
              <Icon name="sprout" /> MỘT GÓC NHỎ, NHIỀU ĐIỀU MỚI
            </span>
            <h1 id="welcome-title">
              Gieo một từ mới.
              <br />
              <em>Mở thêm thế giới.</em>
            </h1>
            <p>
              Học từng chút, nhớ từng ngày. Cùng một người bạn nhỏ biến việc học
              tiếng Anh thành khoảng thời gian bạn mong chờ.
            </p>
            <div className="welcome-hero-actions">
              <button
                className="welcome-button"
                type="button"
                onClick={() => show(choice.current)}
              >
                Bắt đầu hành trình <Icon name="arrow" />
              </button>
              <button
                className="welcome-text-button"
                type="button"
                onClick={() => show(demoSection.current)}
              >
                <Icon name="play" /> Mình muốn học thử
              </button>
            </div>
            <div className="welcome-hero-details">
              <span>
                <Icon name="check" /> Học theo nhịp của bạn
              </span>
              <span>
                <Icon name="check" /> Lưu tiến độ theo tài khoản
              </span>
            </div>
          </div>
          <div className="welcome-scene">
            <div className="welcome-scene-orbit" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span className="welcome-scene-tag">
              <Icon name="sparkles" /> Mỗi ngày một chút
            </span>
            <div className="welcome-speech" role="status">
              <strong>
                {greeting ? 'Yay, chào bạn mới!' : 'Chào bạn, mình ở đây!'}
              </strong>
              <span>
                {greeting
                  ? 'Một từ mới đầu tiên đang chờ mình đó.'
                  : 'Mình cùng lớn lên qua từng từ mới nhé.'}
              </span>
            </div>
            <button
              className={`welcome-mascot-button${greeting ? ' is-greeting' : ''}`}
              type="button"
              aria-label="Chào linh thú đồng hành"
              onClick={async () => {
                setGreeting((value) => !value);
                setGreetingCount((value) => value + 1);
                if (await unlockAudio())
                  announceFeedback(
                    'correct',
                    `mascot-greeting:${greetingCount}`,
                  );
              }}
            >
              <Mascot mood={greeting ? 'celebrate' : 'welcome'} />
            </button>
            <div className="welcome-floating-word">
              <span>TỪ ĐẦU TIÊN CỦA BẠN</span>
              <strong>
                grow{' '}
                <i>
                  <Icon name="sprout" />
                </i>
              </strong>
              <small>/ɡroʊ/ · lớn lên, phát triển</small>
            </div>
            <span className="welcome-scene-caption">
              <Icon name="user" /> Một người bạn nhỏ, cùng bạn mỗi ngày.
            </span>
          </div>
        </section>
        <section
          className="welcome-benefits"
          aria-label="Những điều bạn có thể làm"
        >
          <div>
            <span>
              <Icon name="learn" />
            </span>
            <p>
              <strong>Học điều bạn cần</strong>
              <small>Chủ đề IELTS và giao tiếp</small>
            </p>
          </div>
          <div>
            <span>
              <Icon name="notebook" />
            </span>
            <p>
              <strong>Giữ lại từ bạn gặp</strong>
              <small>Sổ tay riêng, lưu từ từ extension</small>
            </p>
          </div>
          <div>
            <span>
              <Icon name="review" />
            </span>
            <p>
              <strong>Nhớ thêm mỗi lần ôn</strong>
              <small>Theo dõi từng mức ghi nhớ</small>
            </p>
          </div>
        </section>
        <section
          className="welcome-journey"
          id="welcome-journey"
          tabIndex={-1}
          aria-labelledby="journey-title"
        >
          <div className="welcome-section-heading">
            <span className="welcome-eyebrow">NHỎ THÔI, NHƯNG ĐỀU ĐẶN</span>
            <h2 id="journey-title">Một hành trình thật dễ bắt đầu.</h2>
            <p>
              Không cần học thật nhiều trong một lần. Chỉ cần quay lại và tiến
              thêm một chút.
            </p>
          </div>
          <div className="welcome-journey-layout">
            <div
              className="welcome-chapters"
              role="tablist"
              aria-label="Các bước học"
              aria-orientation="vertical"
            >
              {chapters.map((item, index) => (
                <button
                  key={item.tag}
                  type="button"
                  role="tab"
                  id={`journey-tab-${index}`}
                  aria-selected={chapter === index}
                  aria-controls="journey-panel"
                  tabIndex={chapter === index ? 0 : -1}
                  className={chapter === index ? 'is-active' : ''}
                  onClick={() => setChapter(index)}
                  onKeyDown={(event) => {
                    if (
                      ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(
                        event.key,
                      )
                    ) {
                      event.preventDefault();
                      const next =
                        event.key === 'Home'
                          ? 0
                          : event.key === 'End'
                            ? chapters.length - 1
                            : (index +
                                (event.key === 'ArrowDown' ? 1 : -1) +
                                chapters.length) %
                              chapters.length;
                      setChapter(next);
                      document.getElementById(`journey-tab-${next}`)?.focus();
                    }
                  }}
                >
                  <span className="welcome-chapter-icon">
                    <Icon name={item.icon} />
                  </span>
                  <span>
                    <small>{item.tag}</small>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </span>
                  <Icon name="arrow" />
                </button>
              ))}
            </div>
            <div
              className="welcome-journey-panel"
              role="tabpanel"
              id="journey-panel"
              aria-labelledby={`journey-tab-${chapter}`}
              tabIndex={0}
            >
              <div className="welcome-preview-card" key={chapter}>
                <span className="welcome-preview-pill">
                  <Icon name={current.icon} />{' '}
                  {
                    ['Khám phá từ mới', 'Sổ tay của bạn', 'Cùng ôn lại nhé'][
                      chapter
                    ]
                  }
                </span>
                <h3>{current.word}</h3>
                <span className="welcome-preview-ipa">{current.ipa}</span>
                <p>{current.meaning}</p>
                <div className="welcome-preview-example">
                  Every small step helps you{' '}
                  <strong>
                    {current.word === 'grow'
                      ? 'grow'
                      : current.word === 'discover'
                        ? 'discover more'
                        : 'remember more'}
                  </strong>
                  .
                </div>
                <div className="welcome-preview-progress" aria-hidden="true">
                  <i style={{ width: `${((chapter + 1) / 3) * 100}%` }} />
                </div>
                <small>Minh hoạ cách học · không phải tiến độ tài khoản</small>
              </div>
              <Mascot compact mood={chapter === 2 ? 'celebrate' : 'thinking'} />
            </div>
          </div>
        </section>
        <section
          className="welcome-demo"
          ref={demoSection}
          tabIndex={-1}
          aria-labelledby="demo-title"
        >
          <div className="welcome-demo-copy">
            <span className="welcome-eyebrow">
              <Icon name="sparkles" /> THỬ MỘT CHÚT NHÉ
            </span>
            <h2 id="demo-title">
              Một từ mới.
              <br />
              Một khởi đầu nhỏ.
            </h2>
            <p>
              Thử cách học ngay tại đây. Chưa cần tài khoản, chưa lưu tiến độ —
              chỉ là một phút làm quen cùng mình.
            </p>
            <div className="welcome-demo-note">
              <Icon name="volume" />
              <span>
                Muốn nghe tiếng cổ vũ? Bật âm thanh ở nút{' '}
                <strong>Không gian học</strong> góc dưới.
              </span>
            </div>
          </div>
          <div
            className={`welcome-demo-card${demo === 'done' ? ' is-done' : ''}`}
          >
            <span className="welcome-preview-pill">
              <Icon name={demo === 'done' ? 'check' : 'sprout'} />{' '}
              {demo === 'front'
                ? 'Làm quen với từ'
                : demo === 'recall'
                  ? 'Thử nhớ lại'
                  : 'Khởi đầu thật tốt!'}
            </span>
            {demo === 'front' ? (
              <>
                <h3>grow</h3>
                <span className="welcome-preview-ipa">/ɡroʊ/ · động từ</span>
                <p className="welcome-demo-meaning">lớn lên, phát triển</p>
                <blockquote>
                  Little by little, we <strong>grow</strong>.
                  <small>Từng chút một, chúng ta lớn lên.</small>
                </blockquote>
                <button
                  className="welcome-listen"
                  type="button"
                  onClick={() => speech.speak('grow')}
                >
                  <Icon name="volume" /> Nghe phát âm
                </button>
                <button
                  className="welcome-button"
                  type="button"
                  onClick={() => {
                    setDemo('recall');
                    setNotice('');
                  }}
                >
                  Mình nhớ rồi, thử nhé <Icon name="arrow" />
                </button>
              </>
            ) : demo === 'recall' ? (
              <form onSubmit={tryWord}>
                <h3>“Lớn lên, phát triển”</h3>
                <label htmlFor="welcome-answer">
                  Bạn nhớ từ tiếng Anh vừa học chứ?
                </label>
                <input
                  id="welcome-answer"
                  value={answer}
                  onChange={(event) => {
                    setAnswer(event.target.value);
                    setNotice('');
                  }}
                  maxLength={60}
                  placeholder="Viết lại từ vừa học…"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  aria-describedby={notice ? 'welcome-demo-notice' : undefined}
                />
                <button
                  className="welcome-button"
                  type="submit"
                  disabled={!answer.trim()}
                >
                  Kiểm tra <Icon name="check" />
                </button>
                <button
                  className="welcome-text-button"
                  type="button"
                  onClick={() => {
                    setDemo('front');
                    setNotice('');
                  }}
                >
                  Xem lại từ một chút
                </button>
              </form>
            ) : (
              <>
                <div className="welcome-demo-success">
                  <Icon name="check" />
                </div>
                <h3>
                  Bạn vừa nhớ
                  <br />
                  một từ mới!
                </h3>
                <p>
                  Một khởi đầu nhỏ, nhưng là của bạn. Tạo tài khoản để lưu những
                  bước tiếp theo nhé.
                </p>
                <a className="welcome-button" href="#/register">
                  Lưu hành trình của mình <Icon name="arrow" />
                </a>
                <button
                  className="welcome-text-button"
                  type="button"
                  onClick={() => {
                    setDemo('front');
                    setAnswer('');
                    setNotice('');
                  }}
                >
                  Thử lại từ đầu
                </button>
              </>
            )}
            {notice && (
              <p
                id="welcome-demo-notice"
                className="welcome-demo-notice"
                role="status"
              >
                {notice}
              </p>
            )}
            {speech.error && (
              <p className="welcome-demo-notice" role="status">
                {speech.error}
              </p>
            )}
          </div>
        </section>
        <section
          className="welcome-choice"
          ref={choice}
          tabIndex={-1}
          aria-labelledby="choice-title"
        >
          <span className="welcome-eyebrow">SẴN SÀNG RỒI THÌ MÌNH ĐI THÔI</span>
          <h2 id="choice-title">Bạn đã có tài khoản chưa?</h2>
          <p>Chọn lối của bạn. Mình sẽ chờ ở bên kia.</p>
          <div className="welcome-choice-grid">
            <a
              className="welcome-account-card welcome-account-card--new"
              href="#/register"
            >
              <span className="welcome-choice-icon">
                <Icon name="sprout" />
              </span>
              <span>
                <small>MÌNH LÀ NGƯỜI MỚI</small>
                <strong>Tạo một khởi đầu mới</strong>
                <p>Tạo tài khoản để có sổ tay riêng và lưu tiến độ học.</p>
                <b>
                  Tạo tài khoản <Icon name="arrow" />
                </b>
              </span>
            </a>
            <a className="welcome-account-card" href="#/login">
              <span className="welcome-choice-icon">
                <Icon name="user" />
              </span>
              <span>
                <small>MÌNH ĐÃ CÓ TÀI KHOẢN</small>
                <strong>Tiếp tục hành trình</strong>
                <p>Đăng nhập và gặp lại những từ bạn đang học.</p>
                <b>
                  Đăng nhập <Icon name="arrow" />
                </b>
              </span>
            </a>
          </div>
          <p className="welcome-choice-help">
            Quên mật khẩu?{' '}
            <a href="#/forgot-password">Mình giúp bạn quay lại.</a>
          </p>
        </section>
      </main>
      <footer className="welcome-footer">
        <Brand />
        <p>Mỗi ngày một chút, nhớ lâu hơn.</p>
        <a href="#/login">
          Quay lại góc học tập <Icon name="arrow" />
        </a>
      </footer>
    </div>
  );
}
