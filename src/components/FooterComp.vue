<template>
  <footer class="footer">
    <ul class="footer-links">
      <li>Features</li>
      <li>About</li>
      <li>Testimonials</li>
      <li>Contact</li>
      <li>Download</li>
    </ul>

    <p class="address">Team Four loop, Minneapolis, MN 55455</p>
    <p class="copyright">© 2025 MediMate — All rights reserved.</p>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: 80px;
  padding: 40px 20px;
  text-align: center;
  background: var(--color-card);
}

.footer-links {
  display: flex;
  gap: 28px;
  justify-content: center;
  list-style: none;
  margin-bottom: 20px;
}

.footer-links li {
  font-size: 15px;
  color: var(--color-text);
  cursor: pointer;
}

.address,
.copyright {
  color: var(--color-subtle-text);
  font-size: 14px;
}
</style>
