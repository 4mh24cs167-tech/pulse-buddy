import os
import sys
import math
import subprocess
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def extract_alpha_matte(img_bgr):
    """
    Extracts alpha mask from green screen image with despill.
    """
    b = img_bgr[:, :, 0].astype(float)
    g = img_bgr[:, :, 1].astype(float)
    r = img_bgr[:, :, 2].astype(float)
    
    max_rb = np.maximum(r, b)
    diff = g - max_rb
    
    # Smooth alpha ramp
    alpha = 1.0 - np.clip((diff - 20.0) / 40.0, 0.0, 1.0)
    
    # Despill: suppress excess green in boundary pixels
    fg_g = np.where(g > max_rb, max_rb + (g - max_rb) * 0.15, g)
    fg_bgr = np.stack([b, fg_g, r], axis=-1)
    
    return fg_bgr, alpha

def composite_on_pure_green(fg_bgr, alpha, target_w=540, target_h=960, scale=1.0, dy=0, dx=0, angle=0.0):
    """
    Composites foreground with transform onto perfectly solid RGB(0, 255, 0) canvas.
    """
    h, w = fg_bgr.shape[:2]
    
    # Fit into target while preserving aspect ratio
    base_scale = min(target_w / w, target_h / h) * 0.96 * scale
    new_w = int(w * base_scale)
    new_h = int(h * base_scale)
    
    resized_fg = cv2.resize(fg_bgr, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
    resized_alpha = cv2.resize(alpha, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
    
    # Create target canvas: in BGR, pure green is (0, 255, 0)
    canvas = np.zeros((target_h, target_w, 3), dtype=np.uint8)
    canvas[:, :] = [0, 255, 0]
    
    # Calculate placement centered horizontally, pinned near bottom
    x_offset = int((target_w - new_w) / 2 + dx)
    y_offset = int((target_h - new_h) * 0.85 + dy)
    
    # Apply optional subtle rotation
    if abs(angle) > 0.01:
        center = (new_w // 2, new_h // 2)
        rot_mat = cv2.getRotationMatrix2D(center, angle, 1.0)
        resized_fg = cv2.warpAffine(resized_fg, rot_mat, (new_w, new_h), borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 255, 0))
        resized_alpha = cv2.warpAffine(resized_alpha, rot_mat, (new_w, new_h), borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    
    # Clipping bounds
    src_x1 = max(0, -x_offset)
    src_y1 = max(0, -y_offset)
    src_x2 = min(new_w, target_w - x_offset)
    src_y2 = min(new_h, target_h - y_offset)
    
    dst_x1 = max(0, x_offset)
    dst_y1 = max(0, y_offset)
    dst_x2 = dst_x1 + (src_x2 - src_x1)
    dst_y2 = dst_y1 + (src_y2 - src_y1)
    
    if dst_x2 > dst_x1 and dst_y2 > dst_y1 and src_x2 > src_x1 and src_y2 > src_y1:
        crop_fg = resized_fg[src_y1:src_y2, src_x1:src_x2]
        crop_a = resized_alpha[src_y1:src_y2, src_x1:src_x2, None]
        bg_crop = canvas[dst_y1:dst_y2, dst_x1:dst_x2].astype(float)
        
        blended = crop_fg * crop_a + bg_crop * (1.0 - crop_a)
        canvas[dst_y1:dst_y2, dst_x1:dst_x2] = np.clip(blended, 0, 255).astype(np.uint8)
        
    return canvas

def encode_video_with_ffmpeg(frames, output_path, fps=30, ffmpeg_exe='ffmpeg'):
    h, w, c = frames[0].shape
    cmd = [
        ffmpeg_exe,
        '-y',
        '-f', 'rawvideo',
        '-vcodec', 'rawvideo',
        '-s', f'{w}x{h}',
        '-pix_fmt', 'bgr24',
        '-r', str(fps),
        '-i', '-',
        '-c:v', 'libx264',
        '-profile:v', 'high',
        '-level', '4.0',
        '-pix_fmt', 'yuv420p',
        '-preset', 'slow',
        '-crf', '19',
        '-movflags', '+faststart',
        output_path
    ]
    
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    for frame in frames:
        proc.stdin.write(frame.tobytes())
    stdout, stderr = proc.communicate()
    
    if proc.returncode != 0:
        print(f"Error encoding {output_path}:", stderr.decode('utf-8', errors='ignore'))
        return False
    print(f"Successfully generated: {output_path} ({os.path.getsize(output_path) / 1024:.1f} KB)")
    return True

def generate_all_demo_clips(ref_dir, out_dir, ffmpeg_exe):
    os.makedirs(out_dir, exist_ok=True)
    
    idle_path = os.path.join(ref_dir, 'pulse_buddy_avatar_1791717937320.jpg')
    happy_path = os.path.join(ref_dir, 'pulse_buddy_happy_1791718017334.jpg')
    sad_path = os.path.join(ref_dir, 'pulse_buddy_sad_1791718144205.jpg')
    
    print("Loading reference assets...")
    img_idle = cv2.imread(idle_path)
    img_happy = cv2.imread(happy_path)
    img_sad = cv2.imread(sad_path)
    
    fg_idle, a_idle = extract_alpha_matte(img_idle)
    fg_happy, a_happy = extract_alpha_matte(img_happy)
    fg_sad, a_sad = extract_alpha_matte(img_sad)
    
    W, H = 540, 960
    FPS = 30
    
    # -------------------------------------------------------------
    # 1. CLIP A — IDLE / FRIENDLY GREETING (4.0s = 120 frames)
    # -------------------------------------------------------------
    print("\nGenerating Clip A (demo-idle.mp4)...")
    idle_frames = []
    total_frames = 120
    for i in range(total_frames):
        t = i / FPS
        # Subtle harmonic breathing: cycle every 2.0s
        breath = math.sin(t * math.pi) * 3.0
        # Subtle friendly head sway
        sway_angle = math.sin(t * 1.5) * 0.6
        # Subtle horizontal weight shift
        sway_x = math.sin(t * 1.0) * 1.5
        
        frame = composite_on_pure_green(fg_idle, a_idle, W, H, scale=1.0, dy=-breath, dx=sway_x, angle=sway_angle)
        
        # Subtle eye blink at t=1.8s and t=3.4s
        blink1 = max(0.0, 1.0 - abs(t - 1.8) / 0.08)
        blink2 = max(0.0, 1.0 - abs(t - 3.4) / 0.08)
        blink = max(blink1, blink2)
        if blink > 0.05:
            # Subtle eyelid overlay on face area
            eye_y = int(H * 0.19 - breath)
            eye_x1 = int(W * 0.46 + sway_x)
            eye_x2 = int(W * 0.54 + sway_x)
            cv2.ellipse(frame, (eye_x1, eye_y), (10, int(6 * blink)), 0, 0, 360, (50, 40, 35), -1)
            cv2.ellipse(frame, (eye_x2, eye_y), (10, int(6 * blink)), 0, 0, 360, (50, 40, 35), -1)
            
        idle_frames.append(frame)
        
    encode_video_with_ffmpeg(idle_frames, os.path.join(out_dir, 'demo-idle.mp4'), FPS, ffmpeg_exe)
    
    # -------------------------------------------------------------
    # 2. CLIP B — HAPPY / CELEBRATION (3.5s = 105 frames)
    # -------------------------------------------------------------
    print("\nGenerating Clip B (demo-happy.mp4)...")
    happy_frames = []
    total_frames_happy = 105
    for i in range(total_frames_happy):
        t = i / FPS
        # Joyful harmonic celebration bounce
        bounce = math.sin(t * 4.5) * 6.0 * math.exp(-t * 0.3)
        scale_mod = 1.0 + 0.03 * math.sin(t * 4.5) * math.exp(-t * 0.4)
        tilt = math.sin(t * 3.0) * 1.2
        
        frame = composite_on_pure_green(fg_happy, a_happy, W, H, scale=scale_mod, dy=-bounce, dx=0, angle=tilt)
        
        # Add celebratory golden sparkles floating around character
        for p_idx in range(6):
            p_time = (t * 1.8 + p_idx * 0.5) % 3.0
            px = int(W * (0.25 + 0.5 * (p_idx / 5.0)) + math.sin(p_time * 4.0) * 20.0)
            py = int(H * (0.8 - p_time * 0.5))
            if 0 < px < W and 0 < py < H:
                sparkle_size = int(2 + math.sin(p_time * 8.0) * 2)
                # Golden yellow in BGR: (50, 215, 255)
                cv2.circle(frame, (px, py), max(1, sparkle_size), (50, 215, 255), -1)
                
        happy_frames.append(frame)
        
    encode_video_with_ffmpeg(happy_frames, os.path.join(out_dir, 'demo-happy.mp4'), FPS, ffmpeg_exe)
    
    # -------------------------------------------------------------
    # 3. CLIP C — SAD / NOT COMPLETED (3.5s = 105 frames)
    # -------------------------------------------------------------
    print("\nGenerating Clip C (demo-sad.mp4)...")
    sad_frames = []
    total_frames_sad = 105
    for i in range(total_frames_sad):
        t = i / FPS
        # Gradual gentle slump over first 1.2s then subtle disappointed breathing
        slump_prog = min(1.0, t / 1.2)
        slump_y = 12.0 * (1.0 - math.cos(slump_prog * math.pi / 2))
        slump_angle = -1.8 * (1.0 - math.cos(slump_prog * math.pi / 2))
        
        # Gentle shallow breathing sigh
        sigh = math.sin(t * 1.6) * 1.5 if t > 1.2 else 0.0
        
        frame = composite_on_pure_green(fg_sad, a_sad, W, H, scale=0.96, dy=slump_y + sigh, dx=0, angle=slump_angle)
        sad_frames.append(frame)
        
    encode_video_with_ffmpeg(sad_frames, os.path.join(out_dir, 'demo-sad.mp4'), FPS, ffmpeg_exe)
    
    # -------------------------------------------------------------
    # 4. CLIP D — FORWARD / BACKWARD MOVEMENT REFERENCE (4.0s = 120 frames)
    # -------------------------------------------------------------
    print("\nGenerating Clip D (demo-movement-reference.mp4)...")
    move_frames = []
    total_frames_move = 120
    for i in range(total_frames_move):
        t = i / FPS
        if t < 2.0:
            # 0.0s to 2.0s: Lean & step forward toward camera (scale increases 1.0 -> 1.15)
            p = t / 2.0
            smooth_p = (1.0 - math.cos(p * math.pi)) / 2.0
            scale_move = 1.0 + 0.15 * smooth_p
            y_move = -18.0 * smooth_p
            frame = composite_on_pure_green(fg_happy, a_happy, W, H, scale=scale_move, dy=y_move, dx=0, angle=0)
        else:
            # 2.0s to 4.0s: Retreat backward away into distance (scale decreases 1.15 -> 0.85)
            p = (t - 2.0) / 2.0
            smooth_p = (1.0 - math.cos(p * math.pi)) / 2.0
            scale_move = 1.15 - 0.30 * smooth_p
            y_move = -18.0 + 26.0 * smooth_p
            angle_slump = -1.5 * smooth_p
            frame = composite_on_pure_green(fg_sad, a_sad, W, H, scale=scale_move, dy=y_move, dx=0, angle=angle_slump)
            
        move_frames.append(frame)
        
    encode_video_with_ffmpeg(move_frames, os.path.join(out_dir, 'demo-movement-reference.mp4'), FPS, ffmpeg_exe)
    print("\nAll 4 clips generated successfully in:", out_dir)

if __name__ == '__main__':
    ref_dir = r'C:\Users\varsh\.gemini\antigravity\brain\57d95289-bb29-4aa1-aa3b-904b50497573'
    out_dir = r'C:\Users\varsh\OneDrive\Desktop\pulse buddy\apps\web\public\demo-avatars\pulse-buddy'
    ffmpeg = r'C:\Users\varsh\AppData\Local\Programs\Python\Python311\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
    generate_all_demo_clips(ref_dir, out_dir, ffmpeg)
