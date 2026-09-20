import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const componentStyles = fs.readFileSync('styles/components.css', 'utf8');
const hotelStyles = fs.readFileSync('styles/hotel.css', 'utf8');

test('shared PMS operational lists retain professional readable hierarchy', () => {
  assert.match(componentStyles, /\.pms-room-rack__queue-list\s*\{/);
  assert.match(componentStyles, /\.pms-room-rack__queue-list li\s*\{[^}]*grid-template-columns/);
  assert.match(componentStyles, /\.pms-room-rack__queue-list span\s*\{[^}]*line-height/);
  assert.match(
    componentStyles,
    /@media \(max-width: 46rem\)[\s\S]*?\.pms-room-rack__queue-list li\s*\{[^}]*grid-template-columns:\s*1fr/,
  );
});

test('PMS tables are responsive without making every report room-rack width', () => {
  assert.match(componentStyles, /\.pms-room-rack__table-wrap\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(componentStyles, /\.pms-room-rack__table\s*\{[^}]*min-width:\s*52rem/);
  assert.match(
    componentStyles,
    /\.pms-room-rack \.pms-room-rack__table\s*\{[^}]*min-width:\s*78rem/,
  );
});

test('partner financial metric cards stack labels and values with clear emphasis', () => {
  assert.match(hotelStyles, /\.partner-inventory__metrics > \.ui-card[\s\S]*?display:\s*grid/);
  assert.match(
    hotelStyles,
    /\.partner-inventory__metrics > \.ui-card strong[\s\S]*?font-size:\s*clamp/,
  );
});
