package com.calorielog.module.social.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.social.dto.FriendRequestResponse;
import com.calorielog.module.social.dto.FriendResponse;
import com.calorielog.module.social.dto.FriendSearchResponse;
import com.calorielog.module.social.dto.HandleFriendRequestRequest;
import com.calorielog.module.social.dto.SendFriendRequestRequest;
import com.calorielog.module.social.dto.UpdateRemarkRequest;
import com.calorielog.module.social.service.FriendService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "社交 - 好友")
@RestController
@RequestMapping("/api/v1/social")
@RequiredArgsConstructor
public class FriendController {

    private final FriendService friendService;

    @Operation(summary = "按手机号搜索用户")
    @GetMapping("/users/search")
    public Result<FriendSearchResponse> search(@RequestParam String phone) {
        return Result.success(friendService.searchByPhone(CurrentUser.requireUserId(), phone));
    }

    @Operation(summary = "发起好友请求")
    @PostMapping("/friends/request")
    public Result<FriendRequestResponse> sendRequest(@Valid @RequestBody SendFriendRequestRequest req) {
        return Result.success(friendService.sendRequest(CurrentUser.requireUserId(), req));
    }

    @Operation(summary = "好友请求列表", description = "direction=incoming/outgoing，默认 incoming")
    @GetMapping("/friends/requests")
    public Result<List<FriendRequestResponse>> listRequests(
            @RequestParam(defaultValue = "incoming") String direction) {
        return Result.success(friendService.listRequests(CurrentUser.requireUserId(), direction));
    }

    @Operation(summary = "处理好友请求（accept/reject）")
    @PutMapping("/friends/request/{id}")
    public Result<FriendRequestResponse> handle(
            @PathVariable Long id, @Valid @RequestBody HandleFriendRequestRequest req) {
        return Result.success(friendService.handle(CurrentUser.requireUserId(), id, req));
    }

    @Operation(summary = "好友列表")
    @GetMapping("/friends")
    public Result<List<FriendResponse>> listFriends() {
        return Result.success(friendService.listFriends(CurrentUser.requireUserId()));
    }

    @Operation(summary = "删除好友")
    @DeleteMapping("/friends/{friendId}")
    public Result<Void> delete(@PathVariable Long friendId) {
        friendService.delete(CurrentUser.requireUserId(), friendId);
        return Result.success();
    }

    @Operation(summary = "设置好友备注")
    @PutMapping("/friends/{friendId}/remark")
    public Result<FriendResponse> remark(
            @PathVariable Long friendId, @Valid @RequestBody UpdateRemarkRequest req) {
        return Result.success(friendService.updateRemark(CurrentUser.requireUserId(), friendId, req.getRemark()));
    }
}
