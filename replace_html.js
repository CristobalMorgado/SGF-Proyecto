const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const regex = /<select id="cat-tipo" required>[\s\S]*?<option value="Ingreso">Ingreso<\/option>[\s\S]*?<option value="Gasto">Gasto<\/option>[\s\S]*?<\/select>[\s\S]*?<\/div>[\s\S]*?<button type="submit" class="btn-primary">Crear Categoría<\/button>/m;

const replacement = `<select id="cat-tipo" required onchange="togglePresupuesto()">
              <option value="Ingreso">Ingreso</option>
              <option value="Gasto" selected>Gasto</option>
            </select>
          </div>
          <div class="input-group" id="group-presupuesto">
            <label for="cat-presupuesto">Presupuesto Mensual (Opcional)</label>
            <input type="number" id="cat-presupuesto" placeholder="Ej: 200000" min="0">
            <small style="color:#94a3b8; font-size:12px; display:block; margin-top:5px;">Si el gasto supera el 80% de este monto, verás una alerta.</small>
          </div>
          <button type="submit" class="btn-primary">Crear Categoría</button>`;

if (regex.test(html)) {
  fs.writeFileSync('public/index.html', html.replace(regex, replacement));
  console.log('HTML updated successfully');
} else {
  console.log('Regex not found');
}
