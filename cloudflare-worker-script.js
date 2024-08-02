addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const response = await fetch(request)
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('text/html')) {
    let body = await response.text()

    // Inject the FullRes script
    const fullresScript = `
      <script>
        (function(){
          var fullres = document.createElement('script');
          fullres.async = true;
          fullres.src = 'https://t.fullres.net/substack-demo.js?'+(new Date()-new Date()%43200000);
          document.head.appendChild(fullres);
        })();
      </script>
    `

    // Inject the event tracking and metadata script
    const eventScript = `
      <script>
        window.fullres ||= { events: [], metadata: {} };

        document.addEventListener('DOMContentLoaded', function() {
          // Extract post author metadata
          const authorLink = document.querySelector('.profile-hover-card-target a[href*="@"]');
          if (authorLink) {
            const authorHref = authorLink.getAttribute('href');
            window.fullres.metadata.postAuthor = authorHref ? authorHref.split('@')[1] : 'null';
          }

          // Determine if the user is logged in
          const signInLink = document.querySelector('.topbar .navbar-buttons [data-href*="sign-in"]');
          window.fullres.metadata.isLoggedIn = signInLink ? 'false' : 'true';

          // Check for subscription confirmation URL pattern
          const params = new URLSearchParams(window.location.search);
          if (window.location.pathname === '/subscribe' &&
              params.get('utm_source') === 'confirmation_email' &&
              params.get('just_signed_up') === 'true') {
            window.fullres.events.push({ key: 'email_subscription_confirmation' });
          }

          // Track button clicks
          const buttons = [
            { selector: '.navbar-buttons [data-testid="noncontributor-cta-button"]', key: 'subscribe_button_click', label: 'top_right_navbar_button' },
            { selector: '.end-cta-container .subscribe-btn', key: 'subscribe_button_click', label: 'end_of_post_cta_button' },
            { selector: '.subscribe-footer .subscribe-btn', key: 'subscribe_button_click', 'footer_subscribe_form'},
            { selector: '.subscription-widget-wrap:first-of-type .subscribe-btn', key: 'subscribe_button_click', 'beginning_of_post_subscribe_form'},
            { selector: '.subscribe-footer .subscribe-btn', key: 'subscribe_button_click', 'end_of_post_subscribe_form'},
            { selector: '.post-footer .like-button-container a:not(.state-liked)', key: 'post_like_click', label: 'end_of_post'},
            { selector: '.like-button-container.post-ufi-button a:not(.state-liked)', key: 'post_like_click', label: 'beginning_of_post'},
            { selector: '.pencraft .like-button-container a:not(.state-liked)', key: 'post_like_click', label: 'list_of_posts'},
          ];
          buttons.forEach(({ selector, key, label }) => {
            const button = document.querySelector(selector);
            if (button) {
              button.addEventListener('click', function() {
                window.fullres.events.push({ key: key, properties: { button: label } });
              });
            }
          });
        });
      </script>
    `

    body = body.replace('</body>', `${fullresScript}${eventScript}</body>`)
    return new Response(body, {
      headers: response.headers
    })
  }

  return response
}
