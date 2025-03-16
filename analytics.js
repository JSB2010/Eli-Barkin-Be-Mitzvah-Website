// Vercel Analytics Web Mode implementation
// This works better for static sites without server framework integration
(function() {
  window.va = function(command, ...args) {
    (window.va.q = window.va.q || []).push([command, ...args]);
  };

  // Add the script to the page
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  
  // Send standard pageview event
  va('pageview');
  
  // Add the script to the DOM
  document.head.appendChild(script);
})();

// Vercel Speed Insights Web Mode implementation
(function() {
  // Create a script element for Speed Insights
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/speed-insights/script.js';
  
  // Add the script to the DOM
  document.head.appendChild(script);
})();