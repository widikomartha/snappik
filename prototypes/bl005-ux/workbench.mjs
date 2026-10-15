const frame = document.querySelector('#preview');
document.querySelector('#width').addEventListener('change', (event) => {
  frame.className = event.target.value === 'fluid' ? '' : `width-${event.target.value}`;
});
document.querySelector('#scale').addEventListener('change', (event) => {
  frame.contentDocument.documentElement.classList.toggle('text-200', event.target.value === '200');
});
