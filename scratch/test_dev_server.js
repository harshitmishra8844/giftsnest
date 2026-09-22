async function testDev() {
  try {
    const res = await fetch('http://localhost:5173/');
    console.log('Dev Server Status:', res.status);
    const text = await res.text();
    console.log('Includes root div:', text.includes('<div id="root"></div>'));
    console.log('Includes index.html title:', text.includes('Niyora Gifts'));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}
testDev();
