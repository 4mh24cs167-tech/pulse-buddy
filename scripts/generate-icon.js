const fs = require('fs');
const path = require('path');

// Simple valid 16x16 PNG with a blue circle
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABPtJREFUeNrsm0toXFUcxn935s6kndvMtC2Ntk2j1j59QEp9V6vUBwWroKAgiLhzJ+JCdyIuXCi4cKHgwoWICxc+kEKhFm2hlVJbU6tt2mTaZJrMzJ17z3H+z703mcm85iFj00mY+cBg7j1nOP/f7/y/M/dK5/N5s41d2Ld1AawCWBeAZV9XjB3b4dixXUj19/d3dnR0uO3tbbu9vd1tb293Ozo67MzMzA4u3/gBOHHixA4u9+/f7x45csTt7Ox06+vr3fr6eremp8ft7Ox0t7a27Pj4uAkgmUxaBHDy5Mkd8bW1NXd9fd1tb293V1ZWuphg7u/vu6urq+76+roJIJFI2I3t2w5/aWnJnZ+fdxcXF93V1VV3fX3dXVxcdNfX1935+Xk3Ho+b09PTNoDu7u4dXV1de8L29nY7NTXlLi0tuYuLi+7S0pI7PT3tLi8vuxMTE2Z6etoEkEgk7Pj4+A719e7u7o7u7u49/cPDQ3diYsJdXFz0fX5+3p2YmHDn5+fd8fFxE4C5ffv23h0dHXs6Ozt3bW1t2ampKXd+ft6fmJjwAfjT09MmgEQiYcfGxnaA9sR3dHTs6ezs3NPd3b2nq6trV19fn/v222/94+PjvtnZ2R27u7s7AMb3/fv37/B/P93d3btrtdq+arVqV6vVfU1NTR2Li4t7m5ubfc3NzbtfvXplAjC7u7v3z8/P/4Wfnqampn1NTU17k8nkH01NTV3NZvPvzc3Ne5vNZs/8/Px3x48f/9x0dHR0HB0d/WfGZrNpFovFF5vN5h4Y31NTU97k5KTv5s2b/n956NAhH8DIyIjZ2tqywWDQ9PX1me7ubtPd3W1OnjxpBgcHzfj4uMlkMub169fm5cuXf6j9a6VS2dfc3OwDCIfD5uTJk+bAgQMmnU6bw4cPm1OnTpne3l5z5coV8/TpUxNAJBKB7/u8vb19r6+vrw9gYGDADBw4YDo7O01PT4/p4Yd+/fo1gEQiYR4+fGgOHTpkhmC8P3DgAGK86e3t9Z08edLk83nz6tUrc+fOHX83mZqaMgMDA+bEiRNmeHjYHBgYMAMDA+bUqVOmXq+bhw8fmlu3bpkXL16Y58+fm6mpKXPgwAHf3r17/ZUrV8yDBw9MAAcPHjSff/65eeutt8zAwIA5ffq0GRoaMm+99Za5efOmGR0dNdls1rS2tprZ2Vl/sVh0k8mkSSQS5ujRo2ZkZMScPHnS9PT0mKNHj5orV66Yu3fvmgDC4bA5fvy4GRkZ8a8sFotmYGDANDU1mSNHjvgfOX36tPnjjz/M9PS0v2+v19u3vLzswrE8ffrUdHd3m2PHjpm2tjZz8OBBEwwGTXd3t/nggw9Ms9k0N27c8L977tw5E0AqlTJLS0smGo2atra2fdVqdZ9er9vR0dF9ly9f9gHYbdu2mbt37/rf99vf39/X29trTp8+bdrb2/e3tra6bW1tbjqd3rdv3779e3p6fG+99ZYZHh42v/32mwkglUrZLS0tO4rF4t7+/v69vIB9vb29/mg0un///v0Hg8GgXSwWTb1eNwHMz8+bAwcOuG1tbfaBAwf+CwQCpru7287n83a5XLaLxaL/3/LfvXt3Bz73e71ec2ho6K9gMGg/ePDA3L592wRQLpf3TU1N/VcoFMxCofBvPp+/v7297e/t7f27Wq2a5XLZ/4L/26ZyuWy2tra2bW1t/W1sbOzc2Nh4v1qt/lupVP4G/v4GZkqlkgngX+3n1gWwCmBdAJZ9/WcA4F8B70gL6z4xHAAAAABJRU5ErkJggg==';

const pngBuffer = Buffer.from(pngBase64, 'base64');

// Write png icon
const resDir = path.join(__dirname, '../apps/desktop/resources');
if (!fs.existsSync(resDir)) {
  fs.mkdirSync(resDir, { recursive: true });
}

fs.writeFileSync(path.join(resDir, 'icon.png'), pngBuffer);

// Build basic valid ICO format embedding the PNG
// ICO header: 6 bytes
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // Type 1 = ICON
header.writeUInt16LE(1, 4); // 1 Image

// ICO directory entry: 16 bytes
const entry = Buffer.alloc(16);
entry.writeUInt8(64, 0); // width
entry.writeUInt8(64, 1); // height
entry.writeUInt8(0, 2); // color count
entry.writeUInt8(0, 3); // reserved
entry.writeUInt16LE(1, 4); // color planes
entry.writeUInt16LE(32, 6); // bits per pixel
entry.writeUInt32LE(pngBuffer.length, 8); // size of image data
entry.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

const icoBuffer = Buffer.concat([header, entry, pngBuffer]);
fs.writeFileSync(path.join(resDir, 'icon.ico'), icoBuffer);
fs.writeFileSync(path.join(resDir, 'icon.icns'), pngBuffer);

console.log('Successfully generated application icons in apps/desktop/resources!');
