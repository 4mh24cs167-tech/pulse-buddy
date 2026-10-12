import os
import sys
import math
import subprocess
import cv2
import numpy as np

def main():
    ffmpeg = r"C:\Users\varsh\AppData\Local\Programs\Python\Python311\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
    stride1_path = r"C:\Users\varsh\.gemini\antigravity\brain\57d95289-bb29-4aa1-aa3b-904b50497573\pulse_buddy_walk_stride1_1791766409699.jpg"
    stride2_path = r"C:\Users\varsh\.gemini\antigravity\brain\57d95289-bb29-4aa1-aa3b-904b50497573\pulse_buddy_walk_stride2_1791766433032.jpg"
    out_mp4 = r"C:\Users\varsh\OneDrive\Desktop\pulse buddy\apps\web\public\demo-avatars\pulse-buddy\demo-walk-left-to-right.mp4"

    def extract_matte(img_bgr):
        b = img_bgr[:, :, 0].astype(float)
        g = img_bgr[:, :, 1].astype(float)
        r = img_bgr[:, :, 2].astype(float)
        max_rb = np.maximum(r, b)
        diff = g - max_rb
        alpha = 1.0 - np.clip((diff - 20.0) / 40.0, 0.0, 1.0)
        fg_g = np.where(g > max_rb, max_rb + (g - max_rb) * 0.15, g)
        fg_bgr = np.stack([b, fg_g, r], axis=-1)
        return fg_bgr, alpha

    print("Loading stride images...")
    img1 = cv2.imread(stride1_path)
    img2 = cv2.imread(stride2_path)
    fg1, a1 = extract_matte(img1)
    fg2, a2 = extract_matte(img2)

    target_w, target_h = 540, 960
    fps = 30
    num_frames = 105  # 3.5 seconds

    frames = []
    print("Generating walk cycle frames...")
    for i in range(num_frames):
        t = i / fps
        cycle_phase = (t * 1.6) % 1.0
        
        # Smooth cosine blend between stride 1 and stride 2
        blend = (math.cos(cycle_phase * 2 * math.pi) + 1.0) / 2.0
        
        # Natural vertical hip/foot bounce
        bounce_y = -abs(math.sin(cycle_phase * 2 * math.pi)) * 12.0
        
        # Subtle torso tilt in direction of travel
        tilt = 1.5 + math.sin(cycle_phase * 2 * math.pi) * 0.8
        
        # Subtle horizontal weight shift
        shift_x = math.sin(cycle_phase * 2 * math.pi) * 4.0
        
        # Blend foreground and alpha
        fg = fg1 * blend + fg2 * (1.0 - blend)
        alpha = a1 * blend + a2 * (1.0 - blend)
        
        # Composite onto pure green
        h, w = fg.shape[:2]
        base_scale = min(target_w / w, target_h / h) * 0.94
        new_w, new_h = int(w * base_scale), int(h * base_scale)
        
        resized_fg = cv2.resize(fg, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
        resized_alpha = cv2.resize(alpha, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
        
        canvas = np.zeros((target_h, target_w, 3), dtype=np.uint8)
        canvas[:, :] = [0, 255, 0]
        
        center = (new_w // 2, new_h // 2)
        rot_mat = cv2.getRotationMatrix2D(center, -tilt, 1.0)
        rot_fg = cv2.warpAffine(resized_fg, rot_mat, (new_w, new_h), borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 255, 0))
        rot_alpha = cv2.warpAffine(resized_alpha, rot_mat, (new_w, new_h), borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        
        x_off = int((target_w - new_w) / 2 + shift_x)
        y_off = int((target_h - new_h) * 0.85 + bounce_y)
        
        src_x1 = max(0, -x_off)
        src_y1 = max(0, -y_off)
        src_x2 = min(new_w, target_w - x_off)
        src_y2 = min(new_h, target_h - y_off)
        
        dst_x1 = max(0, x_off)
        dst_y1 = max(0, y_off)
        dst_x2 = dst_x1 + (src_x2 - src_x1)
        dst_y2 = dst_y1 + (src_y2 - src_y1)
        
        if dst_x2 > dst_x1 and dst_y2 > dst_y1:
            crop_fg = rot_fg[src_y1:src_y2, src_x1:src_x2]
            crop_a = rot_alpha[src_y1:src_y2, src_x1:src_x2, None]
            bg = canvas[dst_y1:dst_y2, dst_x1:dst_x2].astype(float)
            blended = crop_fg * crop_a + bg * (1.0 - crop_a)
            canvas[dst_y1:dst_y2, dst_x1:dst_x2] = np.clip(blended, 0, 255).astype(np.uint8)
        
        frames.append(canvas)

    print("Encoding video with ffmpeg...")
    cmd = [
        ffmpeg, '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo',
        '-s', f'{target_w}x{target_h}', '-pix_fmt', 'bgr24',
        '-r', str(fps), '-i', '-',
        '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0',
        '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '19',
        '-movflags', '+faststart', out_mp4
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    for f in frames:
        proc.stdin.write(f.tobytes())
    proc.stdin.close()
    proc.wait()
    print("Success! Generated walk video at:", out_mp4)
    print("File size:", os.path.getsize(out_mp4))

if __name__ == "__main__":
    main()
